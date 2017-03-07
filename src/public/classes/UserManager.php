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

namespace AverroesProject;

use AverroesProject\DataTable\InMemoryDataTable;


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
class UserManager {
    
    private $userTable;
    private $relationsTable;
    private $peopleTable;
    
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
    public function __construct($ut = NULL, $rt = NULL, $pt = NULL) {
        $this->userTable = ($ut===NULL) ? new InMemoryDataTable() : $ut;
        $this->relationsTable = ($rt===NULL) ? new InMemoryDataTable() : $rt;
        $this->peopleTable = ($pt===NULL) ? new InMemoryDataTable() : $pt;
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
    public function userExistsById($userId){
        return $this->getUsernameFromUserId($userId) !== false;
    }
    
    /**
     * Returns true if the user identified by $userName exists in the 
     * system 
     * @param string $userName
     * @return boolean
     */
    public function userExistsByUserName($userName){
        return $this->getUserIdFromUserName($userName) !== false;
    }
    
    /**
     * Returns the username associated with $userId or false if the 
     * user does not exist
     * 
     * @param int $userId
     * @return string
     */
    public function getUsernameFromUserId($userId){
        if ($this->userTable->rowExistsById($userId)){
            return $this->userTable->getRow($userId)['username'];
        }
        else{
            return false;
        }
    }
    
    /**
     * Returns the user Id associated with a user name
     * or false if the user does not exist
     * @param string $userName
     * @return int
     */
    public function getUserIdFromUserName($userName){
        return $this->userTable->getIdForKeyValue('username', $userName);
    }
    
    /**
     * Gets the user info from the database
     * @param int $userid User ID
     * @param array $userinfo Array where the information will be stored
     */
    public function getUserInfoByUserId($userid){
        
        $pi = $this->peopleTable->getRow($userid);
        if ($pi=== false) {
            return false;
        }
        $ui = $this->userTable->getRow($userid);
        
        if ($pi['email']){
            // from https://en.gravatar.com/site/implement/hash/
            $emailhash =  md5(strtolower(trim($pi['email']))) ;
        } 
        else {
            $pi['email'] = '';
            $emailhash =  'nohash';
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
        if ($this->userExistsById($userId)){
            $newInfo = [];
            $newInfo['id'] = $userId;
            $newInfo['fullname'] = $fullName;
            $newInfo['email'] = $email;
            return $this->peopleTable->updateRow($newInfo);
        };
        
        return false;
    }
    
    public function getUserInfoByUsername($username){
        $userid = $this->getUserIdFromUserName($username);
        return $this->getUserInfoByUserId($userid);
    }
    
    public function getUserInfoForAllUsers(){
        $allUsers = $this->userTable->getAllRows();
        $allUserInfo = array();
        foreach($allUsers as $user){
            array_push($allUserInfo, $this->getUserInfoByUserId($user['id']));
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
    public function createUserByUsername($userName){
        if ($this->userExistsByUserName($userName)){
            return false;
        }
        return $this->userTable->createRow([ 'username' => $userName]);
    }

    //
    // Allowed action methods
    //
    
     /**
     * Returns true if a user is allowed to do $action
     * @param string $action, the action, normally a verb, e.g.: 'edit-other-users'
     * @return boolean
     */
    public function isUserAllowedTo($userId, $action){
        if ($this->isRoot($userId)){
            return true;
        }
        return $this->relationsTable->findRow(['userId' => $userId, 'relation' => 'isAllowed', 'attribute' => $action]) !== false;
    }
    
    /**
     * Registers an action as allowed for a user
     * @param int $userId
     * @param String $action
     * @return boolean True if successful, false otherwise
     */
    public function allowUserTo($userId, $action){
        if ($this->isRoot($userId)){
            return true;
        }
        if (!$this->userExistsById($userId)){
            return false;
        }
        $this->relationsTable->createRow(['userId' => $userId, 'relation' => 'isAllowed', 'attribute' => $action]);
        return true;
    }
    
    public function disallowUserTo($userId, $action){
        if ($this->isRoot($userId)){
            return false;
        }
        $key = $this->relationsTable->findRow(['userId' => $userId, 'relation' => 'isAllowed', 'attribute' => $action]);
        if ($key === false){
            return true;
        }
        return $this->relationsTable->deleteRow($key);
    }
    
    public function isUserA($userId, $role){
        
        return $this->relationsTable->findRow(['userId' => $userId, 'relation' => 'hasRole', 'attribute' => $role]) !== false;
    }
    
    //
    // Role methods
    //
    
    public function setUserRole($userId, $role){
        
        if (!$this->userExistsById($userId)){
            return false;
        }

        // No need to set any other role for root
        if ($this->isRoot($userId)){
            return true;
        }
        
        $this->relationsTable->createRow(['userId' => $userId, 'relation' => 'hasRole', 'attribute' => $role]);
        
        return true;
        
    }
    
    public function revokeUserRole($userId, $role) {
        $key = $this->relationsTable->findRow(['userId' => $userId, 'relation' => 'hasRole', 'attribute' => $role]);
        if ($key === false){
            return true;
        }
        return $this->relationsTable->deleteRow($key);
        
    }
    
    //
    // root role methods
    //
    
    public function isRoot($userId){
        return $this->isUserA($userId, $this->rootRole);
    }
    public function makeRoot($userId){
        return $this->setUserRole($userId, $this->rootRole);
    }
    
    public function revokeRootStatus($userId){
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
    public function getUserToken($userId){
        if ($this->userExistsById($userId)){
            $userRow = $this->userTable->getRow($userId);
            if (isset($userRow['token'])){
                return $userRow['token'];
            }
            else {
                return '';
            }
        }
        return false;
    }
    
    public function storeUserToken($userId, $token){
        if ($this->userExistsById($userId)){
            return $this->userTable->updateRow(['id' => $userId, 'token' => $token]);
        }
        else {
            return false;
        }
    }
    
    // 
    // Passwords
    //
    
    public function verifyUserPassword($userName, $givenPassword){
        if (!$this->userExistsByUserName($userName)){
            return false;
        }
        $u = $this->userTable->getRow($this->getUserIdFromUserName($userName));
        if (!$u['password']){
            return false;
        }
        //error_log("UM: Checking against hash " . $u['password']);
        return password_verify($givenPassword, $u['password']);
    }
    
    public function storeUserPassword($userName, $password){
        if ($password == '') {
            return false;
        }
        $hash = password_hash($password, PASSWORD_BCRYPT);

        if ($this->userExistsByUserName($userName)){
            $userId = $this->getUserIdFromUserName($userName);
            return $this->userTable->updateRow(['id' => $userId, 'password' => $hash]);
        }
        return false;
    }
    
}
