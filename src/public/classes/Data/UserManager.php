<?php

/*
 *  Copyright (C) 2016 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject\Data;

use DataTable\InMemoryDataTable;


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
class UserManager 
{
    
    private $userTable;
    private $relationsTable;
    private $peopleTable;
    private $tokensTable;
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
     */
    public function __construct($ut = NULL, $rt = NULL, $pt = NULL, $tt = NULL, $logger = NULL)
    {
        $this->userTable = ($ut===NULL) ? new InMemoryDataTable() : $ut;
        $this->relationsTable = ($rt===NULL) ? new InMemoryDataTable() : $rt;
        $this->peopleTable = ($pt===NULL) ? new InMemoryDataTable() : $pt;
        $this->tokensTable = ($tt===NULL) ? new InMemoryDataTable() : $tt;
        if ($logger !== NULL) {
            $this->logger = $logger;
        }
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
    public function userExistsById($userId)
    {
        return $this->getUsernameFromUserId($userId) !== false;
    }
    
    /**
     * Returns true if the user identified by $userName exists in the 
     * system 
     * @param string $userName
     * @return boolean
     */
    public function userExistsByUserName($userName)
    {
        return $this->getUserIdFromUserName($userName) !== false;
    }
    
    /**
     * Returns the username associated with $userId or false if the 
     * user does not exist
     * 
     * @param int $userId
     * @return string
     */
    public function getUsernameFromUserId($userId)
    {
        if ($this->userTable->rowExistsById($userId)) {
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
    public function getUserIdFromUserName($userName)
    {
        return $this->userTable->getIdForKeyValue('username', $userName);
    }
    
    public function getPersonInfo($personId)
    {
        return $this->peopleTable->getRow($personId);
    }
    
    /**
     * Gets the user info from the database
     * @param int $userid User ID
     * @param array $userinfo Array where the information will be stored
     */
    public function getUserInfoByUserId($userid)
    {
        $pi = $this->peopleTable->getRow($userid);
        if ($pi=== false) {
            return false;
        }
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
    
    public function updateUserInfo($userId, $fullName, $email = '')
    {
        if ($fullName === '') {
            return false;
        }
        if ($this->userExistsById($userId)) {
            $newInfo = [];
            $newInfo['id'] = $userId;
            $newInfo['fullname'] = $fullName;
            $newInfo['email'] = $email;
            return false !== $this->peopleTable->updateRow($newInfo);
        };
        
        return false;
    }
    
    public function getUserInfoByUsername($username)
    {
        $userid = $this->getUserIdFromUserName($username);
        return $this->getUserInfoByUserId($userid);
    }
    
    public function getUserInfoForAllUsers()
    {
        $allUsers = $this->userTable->getAllRows();
        $allUserInfo = [];
        foreach($allUsers as $user){
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
    public function createUserByUsername($userName)
    {
        if ($this->userExistsByUserName($userName)) {
            return false;
        }
        $personId = $this->createPerson();
        return $this->userTable->createRow([
            'id' => $personId,
            'username' => $userName]);
    }
    
    /**
     * Creates a new entry in the people table. Returns the new id
     */
    private function createPerson()
    {
        return $this->peopleTable->createRow(['fullname' => '']);
    }
    //
    // Allowed action methods
    //
    
     /**
     * Returns true if a user is allowed to do $action
     * @param string $action, the action, normally a verb, 
     *                e.g.: 'edit-other-users'
     * @return boolean
     */
    public function isUserAllowedTo($userId, $action)
    {
        if ($this->isRoot($userId)){
            return true;
        }
        return $this->relationsTable->findRow(['userId' => $userId, 
            'relation' => 'isAllowed', 'attribute' => $action]) !== false;
    }
    
    /**
     * Registers an action as allowed for a user
     * @param int $userId
     * @param String $action
     * @return boolean True if successful, false otherwise
     */
    public function allowUserTo($userId, $action)
    {
        if ($this->isRoot($userId)){
            return true;
        }
        if (!$this->userExistsById($userId)){
            return false;
        }
        return $this->relationsTable->createRow(['userId' => $userId, 
            'relation' => 'isAllowed', 'attribute' => $action]) !== false;
    }
    
    public function disallowUserTo($userId, $action)
    {
        if (!$this->userExistsById($userId)) {
            return false;
        }
        if ($this->isRoot($userId)) {
            return false;
        }
        $row = $this->relationsTable->findRow(['userId' => $userId, 
            'relation' => 'isAllowed', 'attribute' => $action]);
        if ($row === false){
            return true;
        }
        return $this->relationsTable->deleteRow($row['id']);
    }
    
    public function isUserA($userId, $role)
    {
        
        return $this->relationsTable->findRow(['userId' => $userId, 
            'relation' => 'hasRole', 'attribute' => $role]) !== false;
    }
    
    //
    // Role methods
    //
    
    public function setUserRole($userId, $role)
    {
        
        if (!$this->userExistsById($userId)){
            return false;
        }

        // No need to set any other role for root
        if ($this->isRoot($userId)){
            return true;
        }
        
        $this->relationsTable->createRow(['userId' => $userId, 
            'relation' => 'hasRole', 'attribute' => $role]);
        
        return true;
        
    }
    
    public function revokeUserRole($userId, $role)
    {
        if (!$this->userExistsById($userId)){
            return false;
        }
        // root cannot be revoked any role except the root role
        if ($this->isRoot($userId) && $role !== $this->rootRole) {
            return false;
        }
        
        $row = $this->relationsTable->findRow(['userId' => $userId, 
            'relation' => 'hasRole', 'attribute' => $role]);
        if ($row === false){
            return true;
        }
        return $this->relationsTable->deleteRow($row['id']);
    }
    
    //
    // root role methods
    //
    
    public function isRoot($userId)
    {
        return $this->isUserA($userId, $this->rootRole);
    }
    
    public function makeRoot($userId)
    {
        return $this->setUserRole($userId, $this->rootRole);
    }
    
    public function revokeRootStatus($userId)
    {
        return $this->revokeUserRole($userId, $this->rootRole);
    }
    
    // user tokens
    
    /**
     * Return the token associated with a user Id
     * if there's no token, returns an empty string
     * if the user does not exist returns false
     * @param int $userId
     * @return string
     */
    public function getUserToken($userId, $userAgent, $ipAddress)
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
    
    public function getUserTokenRows($userId, $userAgent, $ipAddress) {
        return $this->tokensTable->findRows( [
            'user_id' => $userId, 
            'user_agent' => $userAgent, 
            'ip_address' => $ipAddress
        ]);
    }
    public function storeUserToken($userId, $userAgent, $ipAddress, $token)
    {
        //$this->logger->debug("Storing user token");
        if ($this->userExistsById($userId)){
            // Get the current token
            $tokenRows = $this->getUserTokenRows($userId, $userAgent, $ipAddress);
            //$this->logger->debug("Token rows: " . print_r($tokenRows, true));
            if ($tokenRows !== false) {
                // Delete current token
                foreach($tokenRows as $tokenRow) {
                    $this->tokensTable->deleteRow($tokenRow['id']);
                }
            }
            
            $row = [
                'user_id' => $userId, 
                'user_agent' => $userAgent, 
                'ip_address' => $ipAddress,
                'token' => $token
            ];
            //$this->logger->debug("Creating row: " . print_r($row, true));
            return false !== $this->tokensTable->createRow($row);
        }
        return false;
    }
    
    // 
    // Passwords
    //
    
    public function verifyUserPassword($userName, $givenPassword)
    {
        if (!$this->userExistsByUserName($userName)){
            return false;
        }
        $u = $this->userTable->getRow($this->getUserIdFromUserName($userName));
        if (!isset($u['password']) || $u['password'] === '') {
            return false;
        }
        //error_log("UM: Checking against hash " . $u['password']);
        return password_verify($givenPassword, $u['password']);
    }
    
    public function storeUserPassword($userName, $password)
    {
        if ($password === '') {
            return false;
        }
        $hash = password_hash($password, PASSWORD_BCRYPT);

        if ($this->userExistsByUserName($userName)){
            $userId = $this->getUserIdFromUserName($userName);
            return false !== $this->userTable->updateRow(['id' => $userId, 
                'password' => $hash]);
        }
        return false;
    }
    
}
