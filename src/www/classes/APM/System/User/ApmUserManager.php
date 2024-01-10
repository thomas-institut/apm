<?php

namespace APM\System\User;

use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use ThomasInstitut\DataTable\DataTable;

class ApmUserManager implements UserManagerInterface, LoggerAwareInterface
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
            $this->cache[$userTid] = $this->getUserDataFromTableRow($rows[0]);
        }
        return $this->cache[$userTid];
    }

    private function getUserDataFromTableRow(array $row) : UserData
    {
        $data = new UserData();

        $flags = explode(',', $row['flags']);
        $data->id = intval($row['id']);
        $data->tid = intval($row['tid']);
        $data->userName = $row['username'];
        $data->passwordHash = is_null($row['password']) ? '' : $row['password'];
        $data->disabled = in_array(UserTag::DISABLED, $flags);
        $data->root = in_array(UserTag::ROOT, $flags);
        $data->readOnly = in_array(UserTag::READ_ONLY, $flags);
        $data->tags = $flags;
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
        return $rows[0]['tid'];
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
        $this->usersTable->updateRow(['id' => $userData->id, 'username' => $newUserName]);
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
    public function createUser(int $tid, string $userName): void
    {
        if ($this->isUser($tid)) {
            return;
        }

        if ($this->isUserNameAlreadyInUse($userName)) {
            throw new UserNameAlreadyInUseException();
        }

        $this->usersTable->createRow([
            'tid' => $tid,
            'username' => $userName,
            'password' => null,
            'flags' => ''
        ]);
    }

    /**
     * @inheritDoc
     */
    public function isStringValidUserName(string $userName) : bool {
        return strlen($userName) >= 5 && ctype_alnum($userName);
    }

    public function isStringValidTag(string $flagName) : bool
    {
        return $flagName !== '' && ctype_alnum($flagName);
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
            $newFlagArray = $userData->tags;
            $newFlagArray[]  = $tag;
            $this->usersTable->updateRow([ 'id' => $userData->id, 'flags' => implode(',', $newFlagArray)]);
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
            $newFlagArray = [];
            foreach($userData->tags as $currentFlag) {
                if($currentFlag !== $tag) {
                    $newFlagArray[] = $currentFlag;
                }
            }
            $this->usersTable->updateRow([ 'id' => $userData->id, 'flags' => implode(',', $newFlagArray)]);
            unset($this->cache[$userTid]);
        }
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
        return $rows[0]['token'] ?? '';
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
        $this->tokensTable->deleteRow($tokenRows[0]['id']);
    }

    /**
     * @inheritDoc
     */
    public function storeToken(int $userTid, string $userAgent, string $token): void
    {
        $userData = $this->getUserData($userTid);
        if ($userAgent === '' || $token === '') {
            return;
        }
        $this->deleteToken($userTid, $userAgent); // this checks if the user exists
        $this->tokensTable->createRow([
            'user_id' => $userData->id,
            'user_tid' => $userTid,
            'user_agent' => $userAgent,
            'ip_address' => '',
            'token' => $token]);
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
    public function storePassword(int $userTid, string $password): void
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
        $this->usersTable->updateRow(['id'=> $userData->id, 'password' => $tablePasswordValue ]);
        unset($this->cache[$userTid]);
    }
}