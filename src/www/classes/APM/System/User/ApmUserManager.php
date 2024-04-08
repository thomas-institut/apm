<?php

namespace APM\System\User;

use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use RuntimeException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;

class ApmUserManager implements UserManagerInterface
{

    use LoggerAwareTrait;

    const DataId = 'um001';
    const DefaultTtl = 24 * 3600;


    /**
     * @var callable
     */
    private $usersTableCallable;
    /**
     * @var callable
     */
    private $tokensTableCallable;

    private ?DataTable $usersTable;
    private ?DataTable $tokensTable;
    private DataCache $cache;
    private string $cachePrefix;


    public function __construct(callable|DataTable $usersTable, callable|DataTable $tokensTable, DataCache $dataCache, string $cachePrefix)
    {

        if (is_callable($usersTable)) {
            $this->usersTableCallable = $usersTable;
            $this->usersTable = null;
        } else {
            $this->usersTable = $usersTable;
        }
        if (is_callable($tokensTable)) {
            $this->tokensTableCallable = $tokensTable;
            $this->tokensTable = null;
        } else {
            $this->tokensTable = $tokensTable;
        }
        $this->cache = $dataCache;
        $this->cachePrefix = $cachePrefix;
        $this->logger = new NullLogger();
    }

    private function getDataCacheKey(int $tid) : string {
        return "$this->cachePrefix$tid-" . self::DataId;
    }

    private function getTokensCacheKey(int $tid) : string {
        return "$this->cachePrefix$tid-tokens-" . self::DataId;
    }


    private function getUsersTable() : DataTable {

        if (is_null($this->usersTable)) {
            $this->usersTable = call_user_func($this->usersTableCallable);
        }
        return $this->usersTable;
    }

    private function getTokensTable() : DataTable {
        if (is_null($this->tokensTable)) {
            $this->tokensTable = call_user_func($this->tokensTableCallable);
        }
        return $this->tokensTable;
    }



    public function getAllUsersData() : array
    {
        $data = [];
        foreach ($this->getUsersTable()->getAllRows() as $userRow) {
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
        $cacheKey = $this->getDataCacheKey($userTid);
        try {
            return unserialize($this->cache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $rows = $this->getUsersTable()->findRows(['tid' => $userTid]);
            if (count($rows) === 0) {
                throw new UserNotFoundException();
            }
            $data =  $this->getUserDataFromTableRow($rows->getFirst());
            $this->cache->set($cacheKey, serialize($data), self::DefaultTtl);
            return $data;
        }
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
        $rows = $this->getUsersTable()->findRows(['username' => $userName]);
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
            $this->getUsersTable()->updateRow(['id' => $userData->id, 'username' => $newUserName]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
        $this->cache->delete($this->getDataCacheKey($userTid));
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
            $this->getUsersTable()->updateRow(['id' => $userData->id, 'email_address' => $newEmailAddress]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
        $this->cache->delete($this->getDataCacheKey($userTid));
    }

    /**
     * @inheritDoc
     */
    public function isUserNameAlreadyInUse(string $userName) : bool {
        return count($this->getUsersTable()->findRows(['username' => $userName])) !== 0;
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
            $this->getUsersTable()->createRow([
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
            $this->getUsersTable()->updateRow(['id' => $userData->id, 'password' => null]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen, but it's not catastrophic, we can continue
            $this->logger->error($e->getMessage());
        }
        $this->cache->delete($this->getDataCacheKey($userTid));
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
                $this->getUsersTable()->updateRow(['id' => $userData->id, 'tags' => implode(',', $newTagArray)]);
            } catch (InvalidRowForUpdate $e) {
                // should never happen
                $this->logger->error($e->getMessage());
                throw new RuntimeException($e->getMessage(), $e->getCode());
            }
            $this->cache->delete($this->getDataCacheKey($userTid));
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
                $this->getUsersTable()->updateRow(['id' => $userData->id, 'tags' => implode(',', $newTagArray)]);
            } catch (InvalidRowForUpdate $e) {
                // should never happen
                $this->logger->error($e->getMessage());
                throw new RuntimeException($e->getMessage(), $e->getCode());
            }
            $this->cache->delete($this->getDataCacheKey($userTid));
        }
    }

    public function isRoot(int $userTid) : bool {
        return $this->hasTag($userTid, UserTag::ROOT);
    }


    private function getAllUserTokenRows(int $userTid) {
        try {
            return unserialize($this->cache->get($this->getTokensCacheKey($userTid)));
        } catch (KeyNotInCacheException) {
            $rows =  $this->getTokensTable()->findRows( [
                'user_tid' => $userTid,
            ]);
            $tokens = [];
            foreach($rows as $row) {
                $tokens[] = $row;
            }
            $this->cache->set($this->getTokensCacheKey($userTid), serialize($tokens), self::DefaultTtl);
            return $tokens;
        }
    }


    /**
     * @inheritDoc
     */
    public function getTokenByUserAgent(int $userTid, string $userAgent): string
    {
        $rows = $this->getAllUserTokenRows($userTid);
        foreach ($rows as $row) {
            if ($row['user_agent'] === $userAgent) {
                return $row['token'];
            }
        }
        return '';
    }

    /**
     * @inheritDoc
     */
    public function getAllTokens(int $userTid): array
    {
        $rows =  $this->getTokensTable()->findRows( [
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

        $tokenRows = $this->getTokensTable()->findRows([ 'user_tid' => $userTid, 'user_agent' => $userAgent]);
        if (count($tokenRows) === 0) {
            return;
        }
        $this->getTokensTable()->deleteRow($tokenRows->getFirst()['id']);
        $this->cache->delete($this->getTokensCacheKey($userTid));
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
            $this->getTokensTable()->createRow([
                'user_tid' => $userTid,
                'user_agent' => $userAgent,
                'ip_address' => $ipAddress,
                'token' => $token]);
            $this->cache->delete($this->getTokensCacheKey($userTid));
        } catch (RowAlreadyExists $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
    }

    public function removeToken(int $userTid, string $userAgent) : void
    {
        $rows = $this->getTokensTable()->findRows([ 'user_tid' => $userTid, 'user_agent' => $userAgent]);
        foreach($rows as $row) {
            $this->getTokensTable()->deleteRow($row['id']);
        }
        $this->cache->delete($this->getTokensCacheKey($userTid));
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
            $this->getUsersTable()->updateRow(['id' => $userData->id, 'password' => $tablePasswordValue]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
        $this->cache->delete($this->getDataCacheKey($userTid));
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