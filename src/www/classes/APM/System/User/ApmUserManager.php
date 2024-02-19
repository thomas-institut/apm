<?php

namespace APM\System\User;

use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;

class ApmUserManager implements UserManagerInterface
{

    use LoggerAwareTrait;

    private DataTable $usersTable;
    private DataTable $tokensTable;
    private array $cache;


    public function __construct(DataTable $usersTable, DataTable $tokensTable)
    {
        $this->usersTable = $usersTable;
        $this->tokensTable = $tokensTable;
        $this->cache = [];
        $this->logger = new NullLogger();
    }

    public function getAllUsersData() : array
    {
        $data = [];
        foreach ($this->usersTable->getAllRows() as $userRow) {
            $userTid = $userRow['tid'];
            $this->cache[$userTid] = $this->getUserDataFromTableRow($userRow);
            $data[] = $this->cache[$userTid];
        }
        return $data;
    }


    /**
     * @inheritDoc
     */
    public function isUser(int $tid): bool
    {
        try {
            $this->getUserData($tid);
        } catch (UserNotFoundException) {
            return false;
        }
        return true;
    }

    /**
     * @inheritDoc
     */
    public function getUserData(int $userTid): UserData
    {
        if ($userTid <= 0) {
            throw new UserNotFoundException();
        }
        if (!isset($this->cache[$userTid])) {
            $rows = $this->usersTable->findRows(['tid' => $userTid]);
            if (count($rows) === 0) {
                throw new UserNotFoundException();
            }
            $this->cache[$userTid] = $this->getUserDataFromTableRow($rows->getFirst());
        }
        return $this->cache[$userTid];
    }

    private function getUserDataFromTableRow(array $row) : UserData
    {
        $data = new UserData();
        $tagString =  trim($row['tags']);
        $tags = $tagString !== '' ? explode(',', $tagString) : [];
        $data->id = intval($row['id']);
        $data->tid = intval($row['tid']);
        $data->userName = $row['username'];
        $data->emailAddress = $row['email_address'] ?? '';
        $data->passwordHash = is_null($row['password']) ? '' : $row['password'];
        $data->disabled = in_array(UserTag::DISABLED, $tags);
        $data->root = in_array(UserTag::ROOT, $tags);
        $data->readOnly = in_array(UserTag::READ_ONLY, $tags);
        $data->tags = $tags;
        return $data;
    }

    /**
     * @inheritDoc
     */
    public function getUserTidForUserName(string $userName): int
    {
        $rows = $this->usersTable->findRows(['username' => $userName]);
        if (count($rows) === 0) {
            return -1;
        }
        return $rows->getFirst()['tid'];
    }

    /**
     * @inheritDoc
     */
    public function changeUserName(int $userTid, string $newUserName): void
    {
        $userData = $this->getUserData($userTid);
        if ($newUserName === $userData->userName) {
            return;
        }
        if (!$this->isStringValidUserName($newUserName)) {
            throw new InvalidUserNameException();
        }
        if ($this->isUserNameAlreadyInUse($newUserName)) {
            throw new UserNameAlreadyInUseException();
        }
        try {
            $this->usersTable->updateRow(['id' => $userData->id, 'username' => $newUserName]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
        unset($this->cache[$userTid]);
    }


    protected function isValidEmailAddress(string $emailAddress) : bool {
        return str_contains($emailAddress, '@') &&
            !str_starts_with($emailAddress, '@') &&
            !str_ends_with($emailAddress, '@');
    }

    /**
     * @inheritdoc
     */
    public function changeEmailAddress(int $userTid, string $newEmailAddress): void
    {
        $userData = $this->getUserData($userTid);

        if (!$this->isValidEmailAddress($newEmailAddress)) {
            throw new InvalidEmailAddressException("Email address '$newEmailAddress' is not valid");
        }

        try {
            $this->usersTable->updateRow(['id' => $userData->id, 'email_address' => $newEmailAddress]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
        unset($this->cache[$userTid]);
    }

    /**
     * @inheritDoc
     */
    public function isUserNameAlreadyInUse(string $userName) : bool {
        return count($this->usersTable->findRows(['username' => $userName])) !== 0;
    }

    /**
     * @inheritDoc
     */
    public function createUser(int $userTid, string $userName): void
    {
        if ($this->isUser($userTid)) {
            return;
        }

        if ($this->isUserNameAlreadyInUse($userName)) {
            throw new UserNameAlreadyInUseException();
        }

        if (!$this->isStringValidUserName($userName)) {
            throw new InvalidUserNameException();
        }

        try {
            $this->usersTable->createRow([
                'tid' => $userTid,
                'username' => $userName,
                'password' => null,
                'tags' => ''
            ]);
        } catch (RowAlreadyExists $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
    }


    /**
     * @inheritDoc
     */
    public function disableUser(int $userTid) : void {

        $userData = $this->getUserData($userTid);

        $this->addTag($userTid, UserTag::DISABLED);
        try {
            $this->usersTable->updateRow(['id' => $userData->id, 'password' => null]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen, but it's not catastrophic, we can continue
            $this->logger->error($e->getMessage());
        }
        unset($this->cache[$userTid]);
    }

    /**
     * @inheritDoc
     */
    public function isStringValidUserName(string $userName) : bool {
        return strlen($userName) >= 5 && ctype_alnum($userName);
    }

    public function isStringValidTag(string $tagName) : bool
    {
        return $tagName !== '' && ctype_alnum($tagName);
    }

    /**
     * @inheritDoc
     */
    public function hasTag(int $userTid, string $tag): bool
    {
        $data = $this->getUserData($userTid);
        return in_array($tag, $data->tags);
    }

    /**
     * @inheritDoc
     */
    public function addTag(int $userTid, string $tag): void
    {
        if (!$this->hasTag($userTid, $tag)) {
            $userData = $this->getUserData($userTid);
            $newTagArray = $userData->tags;
            $newTagArray[]  = $tag;
            try {
                $this->usersTable->updateRow(['id' => $userData->id, 'tags' => implode(',', $newTagArray)]);
            } catch (InvalidRowForUpdate $e) {
                // should never happen
                $this->logger->error($e->getMessage());
                throw new RuntimeException($e->getMessage(), $e->getCode());
            }
            unset($this->cache[$userTid]);
        }
    }



    /**
     * @inheritDoc
     */
    public function removeTag(int $userTid, string $tag): void
    {
        if ($this->hasTag($userTid, $tag)) {
            $userData = $this->getUserData($userTid);
            $newTagArray = [];
            foreach($userData->tags as $currentTag) {
                if($currentTag !== $tag) {
                    $newTagArray[] = $currentTag;
                }
            }
            try {
                $this->usersTable->updateRow(['id' => $userData->id, 'tags' => implode(',', $newTagArray)]);
            } catch (InvalidRowForUpdate $e) {
                // should never happen
                $this->logger->error($e->getMessage());
                throw new RuntimeException($e->getMessage(), $e->getCode());
            }
            unset($this->cache[$userTid]);
        }
    }

    public function isRoot(int $userTid) : bool {
        return $this->hasTag($userTid, UserTag::ROOT);
    }




    /**
     * @inheritDoc
     */
    public function getTokenByUserAgent(int $userTid, string $userAgent): string
    {
        $rows =  $this->tokensTable->findRows( [
            'user_tid' => $userTid,
            'user_agent' => $userAgent
        ]);
        if (count($rows) === 0) {
            return '';
        }
        return $rows->getFirst()['token'] ?? '';
    }

    /**
     * @inheritDoc
     */
    public function getAllTokens(int $userTid): array
    {
        $rows =  $this->tokensTable->findRows( [
            'user_tid' => $userTid,
        ]);
        $tokenTuples = [];
        foreach($rows as $row) {
            $tokenTuples[] = [ $row['user_agent'], $row['token']];
        }
        return $tokenTuples;
    }

    public function deleteToken(int $userTid, string $userAgent) : void {
        $this->getUserData($userTid); // just to check if the user exists

        $tokenRows = $this->tokensTable->findRows([ 'user_tid' => $userTid, 'user_agent' => $userAgent]);
        if (count($tokenRows) === 0) {
            return;
        }
        $this->tokensTable->deleteRow($tokenRows->getFirst()['id']);
    }

    /**
     * @inheritDoc
     */
    public function storeToken(int $userTid, string $userAgent, string $ipAddress, string $token): void
    {
        if ($userAgent === '' || $token === '') {
            return;
        }
        $this->deleteToken($userTid, $userAgent); // this checks if the user exists
        try {
            $this->tokensTable->createRow([
                'user_tid' => $userTid,
                'user_agent' => $userAgent,
                'ip_address' => $ipAddress,
                'token' => $token]);
        } catch (RowAlreadyExists $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
    }

    public function removeToken(int $userTid, string $userAgent) : void
    {
        $rows = $this->tokensTable->findRows([ 'user_tid' => $userTid, 'user_agent' => $userAgent]);
        foreach($rows as $row) {
            $this->tokensTable->deleteRow($row['id']);
        }
    }

    public function isStringValidPassword(string $someStr) : bool {
        $validNonAlpha = [ '!', '-', '=', '_'];
        return strlen($someStr) >= 8 && ctype_alnum(str_replace($validNonAlpha, '', $someStr));
    }

    /**
     * @inheritDoc
     */
    public function verifyPassword(int $userTid, string $password): bool
    {
        $userData = $this->getUserData($userTid);
        if ($userData->disabled || $userData->passwordHash === '') {
            return false;
        }
        return password_verify($password, $userData->passwordHash);
    }

    /**
     * @inheritDoc
     */
    public function changePassword(int $userTid, string $password): void
    {
        $userData = $this->getUserData($userTid);
        if ($userData->disabled) {
            return;
        }
        if ($password === '') {
            $this->logger->info("Deleting password for user $userTid");
            $tablePasswordValue = null;
        } else {
            if (!$this->isStringValidPassword($password)) {
                throw new InvalidPasswordException();
            }
            $tablePasswordValue = password_hash($password, PASSWORD_BCRYPT);
        }
        try {
            $this->usersTable->updateRow(['id' => $userData->id, 'password' => $tablePasswordValue]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
        unset($this->cache[$userTid]);
    }

    /**
     * @inheritDoc
     */
    public function isEnabled(int $userTid): bool
    {
        return !$this->hasTag($userTid, UserTag::DISABLED);
    }

    /**
     * @inheritDoc
     */
    public function isUserAllowedTo(int $userTid, string $operationTag, bool $writeOperation = true): bool
    {
        if (!$this->isEnabled($userTid)) {
            return false;
        }
        if ($this->isRoot($userTid)) {
            return true;
        }
        if ($writeOperation && $this->hasTag($userTid, UserTag::READ_ONLY)){
            return false;
        }
        return $this->hasTag($userTid, $operationTag);
    }
}