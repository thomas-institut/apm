<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace AverroesProject\Data;

use APM\System\iSqlQueryCounterTrackerAware;
use APM\System\SimpleSqlQueryCounterTrackerAware;
use APM\System\SqlQueryCounterTracker;
use DataTable\DataTable;
use DataTable\InMemoryDataTable;
use Exception;
use Monolog\Logger;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;


/**
 * UserManager manages the system users
 * 
 * Each user in the system has unique integer UserID and a unique string UserName, 
 * can have a password and can have one token to authenticate an open session.
 * 
 * UserManager maintains, for each user, a list of allowed actions and
 * a list of roles. UserManager does not keep track of the meanings
 * of these actions or roles; particularly, UserManager does not
 * enforce a particular set of allowed or disallowed actions for any role 
 * except for the special 'root' role, which is allowed to do 
 * anything in the system and which can't be disallowed to any
 * specific action.
 * 
 * UserManager does not assume that any specific userId or username has
 * the 'root' role. This has to be set by the application.
 * 
 * Internally UserManager uses two data tables which need to have at least
 * the following fields:
 * 
 * userTable: 
 *      id: unique int
 *      username: unique string
 *      token: string;
 *      
 * relationsTable:
 *      id: unique int
 *      userId: int
 *      relation: string
 *      attribute: string
 * 
 * peopleTable:
 *     id: unique int  = userTable.id
 *
 * The tables can have any other fields, which UserManager will simply 
 * ignore
 * 
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class UserManager implements LoggerAwareInterface, iSqlQueryCounterTrackerAware
{
    use SimpleSqlQueryCounterTrackerAware;
    
    private $userTable;
    private $relationsTable;
    private $peopleTable;
    private $tokensTable;

    /**
     * @var Logger
     */
    private $logger;
    
    var $rootRole = 'root';

    //
    // Constructor
    // 
    /**
     * Initializes UserManager with the given data tables.
     * If no tables are given, empty InMemoryDataTables are used.
     * The constructor does not check that the given data tables
     * are properly set up.
     *
     * @param DataTable $ut
     * @param DataTable $rt
     * @param DataTable $pt
     * @param DataTable $tt
     */
    public function __construct($ut = NULL, $rt = NULL, $pt = NULL, $tt = NULL)
    {
        $this->userTable = ($ut===NULL) ? new InMemoryDataTable() : $ut;
        $this->relationsTable = ($rt===NULL) ? new InMemoryDataTable() : $rt;
        $this->peopleTable = ($pt===NULL) ? new InMemoryDataTable() : $pt;
        $this->tokensTable = ($tt===NULL) ? new InMemoryDataTable() : $tt;
        $this->logger = new NullLogger();
        $this->initSqlQueryCounterTracker();
    }
    
    // 
    // User query methods
    //
    
    /**
     * Returns true if the user identified by $userId exists in the 
     * system
     * 
     * @param int $userId
     * @return boolean
     */
    public function userExistsById(int $userId) : bool
    {
        return $this->getUsernameFromUserId($userId) !== false;
    }
    
    /**
     * Returns true if the user identified by $userName exists in the 
     * system 
     * @param string $userName
     * @return boolean
     */
    public function userExistsByUserName(string $userName) : bool
    {
        return $this->getUserIdFromUserName($userName) !== false;
    }

    /**
     * Returns the username associated with $userId or false if the
     * user does not exist
     *
     * @param int $userId
     * @return bool
     */
    public function getUsernameFromUserId(int $userId) : bool
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        if ($this->userTable->rowExists($userId)) {
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
            return $this->userTable->getRow($userId)['username'];
        }
        return false;
    }
    
    /**
     * Returns the user Id associated with a user name
     * or false if the user does not exist
     * @param string $userName
     * @return int
     */
    public function getUserIdFromUserName(string $userName)
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $userId = $this->userTable->getIdForKeyValue('username', $userName);
        return  $userId===DataTable::NULL_ROW_ID ? false : $userId;
    }
    
    public function getPersonInfo(int $personId)
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        return $this->peopleTable->getRow($personId);
    }

    /**
     * Gets the user info from the database
     * @param int $userid User ID
     * @return array|bool
     */
    public function getUserInfoByUserId(int $userid)
    {
        try {
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
            $pi = $this->peopleTable->getRow($userid);
        } catch (Exception $e) {
            return false;
        }

        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $ui = $this->userTable->getRow($userid);
        
        if (!isset($pi['email'])) {
            $pi['email'] = '';
        }
        if ($pi['email']) {
            // from https://en.gravatar.com/site/implement/hash/
            $emailhash =  md5(strtolower(trim($pi['email']))) ;
        } 
        else {
            $pi['email'] = '';
            $emailhash =  '';
        }
        
        
        return [ 'id' => $userid, 
                 'username' => $ui['username'],
                 'fullname' => $pi['fullname'],
                 'email' => $pi['email'], 
                 'emailhash' => $emailhash
                ];
    }
    
    public function updateUserInfo(int $userId, string $fullName, string $email = '')
    {
        if ($fullName === '') {
            return false;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        if ($this->userExistsById($userId)) {
            $newInfo = [];
            $newInfo['id'] = $userId;
            $newInfo['fullname'] = $fullName;
            $newInfo['email'] = $email;
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::UPDATE_COUNTER);
            return false !== $this->peopleTable->updateRow($newInfo);
        }
        
        return false;
    }
    
    public function getUserInfoByUsername(string $username)
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $userid = $this->getUserIdFromUserName($username);
        return $this->getUserInfoByUserId($userid);
    }
    
    public function getUserInfoForAllUsers() : array
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $allUsers = $this->userTable->getAllRows();
        $allUserInfo = [];
        foreach($allUsers as $user){
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
            $allUserInfo[] = $this->getUserInfoByUserId($user['id']);
        }
        return $allUserInfo;
    }
    // 
    // User creation
    //
    
    /**
     * Creates a new user in the system with the given user name
     * Returns the user ID of the newly created user
     * or false if the user was not created
     * @param string $userName
     * @return int
     */
    public function createUserByUsername(string $userName)
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        if ($this->userExistsByUserName($userName)) {
            return false;
        }
        $personId = $this->createPerson();
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::CREATE_COUNTER);
        return $this->userTable->createRow([
            'id' => $personId,
            'username' => $userName]);
    }
    
    /**
     * Creates a new entry in the people table. Returns the new id
     */
    private function createPerson() : int
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::CREATE_COUNTER);
        return $this->peopleTable->createRow(['fullname' => '']);
    }
    //
    // Allowed action methods
    //

    /**
     * Returns true if a user is explicity allowed to do $action
     * @param $userId
     * @param string $action , the action, normally a verb,
     *                e.g.: 'edit-other-users'
     * @return boolean
     */
    public function isUserAllowedTo(int $userId, string $action) : bool
    {
        if ($this->isRoot($userId)){
            return true;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        return $this->relationsTable->findRows(['userId' => $userId,
            'relation' => 'isAllowed', 'attribute' => $action]) !== [];
    }
    
    /**
     * Registers an action as allowed for a user
     * @param int $userId
     * @param string $action
     * @return boolean True if successful, false otherwise
     */
    public function allowUserTo(int $userId, string $action) : bool
    {
        if ($this->isRoot($userId)){
            return true;
        }
        if (!$this->userExistsById($userId)){
            return false;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::CREATE_COUNTER);
        return $this->relationsTable->createRow(['userId' => $userId, 
            'relation' => 'isAllowed', 'attribute' => $action]) !== false;
    }
    
    public function disallowUserTo(int $userId, string $action)
    {
        if (!$this->userExistsById($userId)) {
            return false;
        }
        if ($this->isRoot($userId)) {
            return false;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $rows = $this->relationsTable->findRows(['userId' => $userId,
            'relation' => 'isAllowed', 'attribute' => $action]);
        if ($rows === []){
            return true;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::DELETE_COUNTER);
        return $this->relationsTable->deleteRow($rows[0]['id']) === 1;
    }
    
    public function userHasRole(int $userId, string $role)
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        return $this->relationsTable->findRows(['userId' => $userId,
            'relation' => 'hasRole', 'attribute' => $role]) !== [];
    }
    
    //
    // Role methods
    //
    
    public function setUserRole(int $userId, string $role) : bool
    {
        
        if (!$this->userExistsById($userId)){
            return false;
        }

        // No need to set any other role for root
        if ($this->isRoot($userId)){
            return true;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::CREATE_COUNTER);
        $this->relationsTable->createRow(['userId' => $userId, 
            'relation' => 'hasRole', 'attribute' => $role]);
        
        return true;
        
    }
    
    public function revokeUserRole(int $userId, string $role) : bool
    {
        if (!$this->userExistsById($userId)){
            return false;
        }
        // root cannot be revoked any role except the root role
        if ($this->isRoot($userId) && $role !== $this->rootRole) {
            return false;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $rows = $this->relationsTable->findRows(['userId' => $userId,
            'relation' => 'hasRole', 'attribute' => $role]);
        if ($rows === []){
            return true;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::DELETE_COUNTER);
        return $this->relationsTable->deleteRow($rows[0]['id']) === 1;
    }
    
    //
    // root role methods
    //
    
    public function isRoot(int $userId)
    {
        return $this->userHasRole($userId, $this->rootRole);
    }
    
    public function makeRoot(int $userId)
    {
        return $this->setUserRole($userId, $this->rootRole);
    }
    
    public function revokeRootStatus(int $userId)
    {
        return $this->revokeUserRole($userId, $this->rootRole);
    }
    
    // user tokens

    /**
     * Return the token associated with a user Id
     * if there's no token, returns an empty string
     * if the user does not exist returns false
     * @param int $userId
     * @param $userAgent
     * @param $ipAddress
     * @return string
     */
    public function getUserToken(int $userId, string $userAgent, string $ipAddress)
    {
        if ($this->userExistsById($userId)){
            $tokenRows = $this->getUserTokenRows($userId, $userAgent, $ipAddress);
            if ($tokenRows === false) {
                return '';
            }
            if (count($tokenRows) === 0) {
                return '';
            }
            if (isset($tokenRows[0]['token'])){
                return $tokenRows[0]['token'];
            }
            return '';
        }
        return false;
    }
    
    public function getUserTokenRows(int $userId, string $userAgent, string $ipAddress) : array
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        return $this->tokensTable->findRows( [
            'user_id' => $userId, 
            'user_agent' => $userAgent, 
            'ip_address' => $ipAddress
        ]);
    }
    public function storeUserToken(int $userId, string $userAgent, string $ipAddress, string $token)
    {
        //$this->logger->debug("Storing user token");
        if ($this->userExistsById($userId)){
            // Get the current token
            $tokenRows = $this->getUserTokenRows($userId, $userAgent, $ipAddress);
            //$this->logger->debug("Token rows: " . print_r($tokenRows, true));
            if ($tokenRows !== false) {
                // Delete current token
                foreach($tokenRows as $tokenRow) {
                    $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::DELETE_COUNTER);
                    $this->tokensTable->deleteRow($tokenRow['id']);
                }
            }
            
            $row = [
                'user_id' => $userId, 
                'user_agent' => $userAgent, 
                'ip_address' => $ipAddress,
                'token' => $token,
                'creation_time' => date('Y-m-d H:i:s')
            ];
            //$this->logger->debug("Creating row: " . print_r($row, true));
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::CREATE_COUNTER);
            return false !== $this->tokensTable->createRow($row);
        }
        return false;
    }
    
    // 
    // Passwords
    //
    
    public function verifyUserPassword(string $userName, string $givenPassword)
    {
        if (!$this->userExistsByUserName($userName)){
            return false;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $u = $this->userTable->getRow($this->getUserIdFromUserName($userName));
        if (!isset($u['password']) || $u['password'] === '') {
            return false;
        }
        return password_verify($givenPassword, $u['password']);
    }
    
    public function storeUserPassword(string $userName, string $password)
    {
        if ($password === '') {
            return false;
        }
        $hash = password_hash($password, PASSWORD_BCRYPT);

        if ($this->userExistsByUserName($userName)){
            $userId = $this->getUserIdFromUserName($userName);
            if ($userId === DataTable::NULL_ROW_ID) {
                return false;
            }
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::UPDATE_COUNTER);
            $this->userTable->updateRow(['id' => $userId,
                'password' => $hash]);
            return true;
        }
        return false;
    }

    /**
     * Sets a logger instance on the object.
     *
     * @param LoggerInterface $logger
     *
     * @return void
     */
    public function setLogger(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }
}
