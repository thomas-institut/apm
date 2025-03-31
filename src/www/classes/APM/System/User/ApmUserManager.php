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

    const string DataId = 'um001';
    const int DefaultTtl = 24 * 3600;


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

    private function getDataCacheKey(int $id) : string {
        return "$this->cachePrefix$id-" . self::DataId;
    }

    private function getTokensCacheKey(int $id) : string {
        return "$this->cachePrefix$id-tokens-" . self::DataId;
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
            $userId = $userRow['id'];
            $this->cache[$userId] = $this->getUserDataFromTableRow($userRow);
            $data[] = $this->cache[$userId];
        }
        return $data;
    }


    /**
     * @inheritDoc
     */
    public function isUser(int $id): bool
    {
        try {
            $this->getUserData($id);
        } catch (UserNotFoundException) {
            return false;
        }
        return true;
    }

    /**
     * @inheritDoc
     */
    public function getUserData(int $userId): UserData
    {
        if ($userId <= 0) {
            throw new UserNotFoundException();
        }
        $cacheKey = $this->getDataCacheKey($userId);
        try {
            return unserialize($this->cache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $rows = $this->getUsersTable()->findRows(['id' => $userId]);
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
    public function getUserIdForUserName(string $userName): int
    {
        $rows = $this->getUsersTable()->findRows(['username' => $userName]);
        if (count($rows) === 0) {
            return -1;
        }
        return $rows->getFirst()['id'];
    }

    /**
     * @inheritDoc
     */
    public function changeUserName(int $userId, string $newUserName): void
    {
        $userData = $this->getUserData($userId);
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
        $this->cache->delete($this->getDataCacheKey($userId));
    }


    protected function isValidEmailAddress(string $emailAddress) : bool {
        return str_contains($emailAddress, '@') &&
            !str_starts_with($emailAddress, '@') &&
            !str_ends_with($emailAddress, '@');
    }

    /**
     * @inheritdoc
     */
    public function changeEmailAddress(int $userId, string $newEmailAddress): void
    {
        $userData = $this->getUserData($userId);

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
        $this->cache->delete($this->getDataCacheKey($userId));
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
    public function createUser(int $userId, string $userName): void
    {
        if ($this->isUser($userId)) {
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
                'id' => $userId,
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
    public function disableUser(int $userId) : void {

        $userData = $this->getUserData($userId);

        $this->addTag($userId, UserTag::DISABLED);
        try {
            $this->getUsersTable()->updateRow(['id' => $userData->id, 'password' => null]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen, but it's not catastrophic, we can continue
            $this->logger->error($e->getMessage());
        }
        $this->cache->delete($this->getDataCacheKey($userId));
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
    public function hasTag(int $userId, string $tag): bool
    {
        $data = $this->getUserData($userId);
        return in_array($tag, $data->tags);
    }

    /**
     * @inheritDoc
     */
    public function addTag(int $userId, string $tag): void
    {
        if (!$this->hasTag($userId, $tag)) {
            $userData = $this->getUserData($userId);
            $newTagArray = $userData->tags;
            $newTagArray[]  = $tag;
            try {
                $this->getUsersTable()->updateRow(['id' => $userData->id, 'tags' => implode(',', $newTagArray)]);
            } catch (InvalidRowForUpdate $e) {
                // should never happen
                $this->logger->error($e->getMessage());
                throw new RuntimeException($e->getMessage(), $e->getCode());
            }
            $this->cache->delete($this->getDataCacheKey($userId));
        }
    }



    /**
     * @inheritDoc
     */
    public function removeTag(int $userId, string $tag): void
    {
        if ($this->hasTag($userId, $tag)) {
            $userData = $this->getUserData($userId);
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
            $this->cache->delete($this->getDataCacheKey($userId));
        }
    }

    public function isRoot(int $userId) : bool {
        return $this->hasTag($userId, UserTag::ROOT);
    }


    private function getAllUserTokenRows(int $userId) {
        try {
            return unserialize($this->cache->get($this->getTokensCacheKey($userId)));
        } catch (KeyNotInCacheException) {
            $rows =  $this->getTokensTable()->findRows( [
                'user_tid' => $userId,
            ]);
            $tokens = [];
            foreach($rows as $row) {
                $tokens[] = $row;
            }
            $this->cache->set($this->getTokensCacheKey($userId), serialize($tokens), self::DefaultTtl);
            return $tokens;
        }
    }


    /**
     * @inheritDoc
     */
    public function getTokenByUserAgent(int $userId, string $userAgent): string
    {
        $rows = $this->getAllUserTokenRows($userId);
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
    public function getAllTokens(int $userId): array
    {
        $rows =  $this->getTokensTable()->findRows( [
            'user_tid' => $userId,
        ]);
        $tokenTuples = [];
        foreach($rows as $row) {
            $tokenTuples[] = [ $row['user_agent'], $row['token']];
        }
        return $tokenTuples;
    }

    public function deleteToken(int $userId, string $userAgent) : void {
        $this->getUserData($userId); // just to check if the user exists

        $tokenRows = $this->getTokensTable()->findRows([ 'user_tid' => $userId, 'user_agent' => $userAgent]);
        if (count($tokenRows) === 0) {
            return;
        }
        $this->getTokensTable()->deleteRow($tokenRows->getFirst()['id']);
        $this->cache->delete($this->getTokensCacheKey($userId));
    }

    /**
     * @inheritDoc
     */
    public function storeToken(int $userId, string $userAgent, string $ipAddress, string $token): void
    {
        if ($userAgent === '' || $token === '') {
            return;
        }
        $this->deleteToken($userId, $userAgent); // this checks if the user exists
        try {
            $this->getTokensTable()->createRow([
                'user_tid' => $userId,
                'user_agent' => $userAgent,
                'ip_address' => $ipAddress,
                'token' => $token]);
            $this->cache->delete($this->getTokensCacheKey($userId));
        } catch (RowAlreadyExists $e) {
            // should never happen
            $this->logger->error($e->getMessage());
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
    }

    public function removeToken(int $userId, string $userAgent) : void
    {
        $rows = $this->getTokensTable()->findRows([ 'user_tid' => $userId, 'user_agent' => $userAgent]);
        foreach($rows as $row) {
            $this->getTokensTable()->deleteRow($row['id']);
        }
        $this->cache->delete($this->getTokensCacheKey($userId));
    }

    public function isStringValidPassword(string $someStr) : bool {
        $validNonAlpha = [ '!', '-', '=', '_'];
        return strlen($someStr) >= 8 && ctype_alnum(str_replace($validNonAlpha, '', $someStr));
    }

    /**
     * @inheritDoc
     */
    public function verifyPassword(int $userId, string $password): bool
    {
        $userData = $this->getUserData($userId);
        if ($userData->disabled || $userData->passwordHash === '') {
            return false;
        }
        return password_verify($password, $userData->passwordHash);
    }

    /**
     * @inheritDoc
     */
    public function changePassword(int $userId, string $password): void
    {
        $userData = $this->getUserData($userId);
        if ($userData->disabled) {
            return;
        }
        if ($password === '') {
            $this->logger->info("Deleting password for user $userId");
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
        $this->cache->delete($this->getDataCacheKey($userId));
    }

    /**
     * @inheritDoc
     */
    public function isEnabled(int $userId): bool
    {
        return !$this->hasTag($userId, UserTag::DISABLED);
    }

    /**
     * @inheritDoc
     */
    public function isUserAllowedTo(int $userId, string $operationTag, bool $writeOperation = true): bool
    {
        if (!$this->isEnabled($userId)) {
            return false;
        }
        if ($this->isRoot($userId)) {
            return true;
        }
        if ($writeOperation && $this->hasTag($userId, UserTag::READ_ONLY)){
            return false;
        }
        return $this->hasTag($userId, $operationTag);
    }
}