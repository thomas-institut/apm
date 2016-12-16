<?php

/*
 * Copyright (C) 2016 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace AverroesProject;

/**
 * SiteUserManager provides an interface for handling query and updates to the 
 * information about the users in the system
 * 
 * Each user in the system has unique integer UserID, a unique string UserName, 
 * can have a password and 0 or more open sessions in different browsers.
 * 
 * The SiteUserManager maintains, for each user, a list of allowed actions
 * Action profiles or roles (e.g., editor, etc) can be setup so that 
 *  multiple permissions can be set of a user at once.
 * 
 * The special role 'superuser' is allowed to do anything in the system
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class UserManager {
    
    /**
     * @return bool true if the user exists
     */
    public function userExistsById($userId){
        return $this->getUsernameFromUserId($userId) !== false;
    }
    
    public function userExistsByUserName($userName){
        return $this->getUserIdFromUserName($userName) !== false;
    }
   
    /**
     * @return string The username, or false if the user does not exist
     */
    abstract public function getUsernameFromUserId($userId);
    
    /**
     * @return int the user id or false if the user does not exist
     */
    abstract public function getUserIdFromUserName($userName);

    abstract public function createUserByUsername($userName);
    

    abstract public function isRoot($userId);
    abstract public function makeRoot($userId);
    abstract public function revokeRootStatus($userId);




    /**
     * Returns true if a user is allowed to do $action
     * @param string $action a verb, e.g.: 'edit-other-users'
     * @return bool true 
     */
    public function isUserAllowedTo($userId, $action){
        if ($this->isRoot($userId)){
            return true;
        }
        return $this->isNormalUserAllowedTo($userId, $action);
    }
    
    /**
     * Returns true if a normal user is allowed to do $action
     * Normally it won't be called directly
     */
    abstract protected function isNormalUserAllowedTo($userId, $action);
    
    
    /**
     * Registers an action as allowed for a user
     * @param int $userId
     * @param String $action
     * @return bool True if successful, false otherwise
     */
    public function allowUserTo($userId, $action){
        if ($this->isRoot($userId)){
            return true;
        }
        return $this->allowNormalUserTo($userId, $action);
    }
    
    abstract protected function allowNormalUserTo($userId, $action);
    abstract protected function disallowNormalUserTo($userId, $action);
    
    
    abstract public function isUserA($id, $role);
    
    /**
     * @return bool true if the role was successfully set for the user
     */
    abstract public function setUserRole($userId, $role);
    
    abstract public function revokeUserRole($userId, $role);

}
