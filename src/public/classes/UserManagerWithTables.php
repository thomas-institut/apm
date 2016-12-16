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


require_once 'UserManager.php';
require_once 'DataTable.php';

/**
 * Description of UserManagerSimple
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class UserManagerWithTables extends UserManager {
    
    private $userTable;
    private $relationsTable;
    
    var $rootRole = 'root';
    
    public function __construct($ut = NULL, $rt = NULL) {
        $this->userTable = ($ut===NULL) ? new InMemoryDataTable() : $ut;
        $this->relationsTable = ($rt===NULL) ? new InMemoryDataTable() : $rt;
    }
    
    public function getUsernameFromUserId($userId){
        if ($this->userTable->rowExistsById($userId)){
            return $this->userTable->getRow($userId)['username'];
        }
        else{
            return false;
        }
    }
    
    public function getUserIdFromUserName($userName){
        return $this->userTable->getIdForKeyValue('username', $userName);
    }
    
    
    public function createUserByUsername($userName){
        if ($this->userExistsByUserName($userName)){
            return false;
        }
        return $this->userTable->createRow([ 'username' => $userName]);
    }

    public function isRoot($userId){
        return $this->isUserA($userId, $this->rootRole);
    }
    public function makeRoot($userId){
        return $this->setUserRole($userId, $this->rootRole);
    }
    
    public function revokeRootStatus($userId){
        return $this->revokeUserRole($userId, $this->rootRole);
    }
    /**
     * Returns true if a normal user is allowed to do $action
     * Normally it won't be called directly
     */
    protected function isNormalUserAllowedTo($userId, $action){
        return $this->relationsTable->findRow(['userId' => $userId, 'relation' => 'isAllowed', 'attribute' => $action]) !== false;
    }
    
    public function allowNormalUserTo($userId, $action){
        if (!$this->userExistsById($userId)){
            return false;
        }
        $this->relationsTable->createRow(['userId' => $userId, 'relation' => 'isAllowed', 'attribute' => $action]);
        return true;
        
    }
    
    public function disallowNormalUserTo($userId, $action){
        $key = $this->relationsTable->findRow(['userId' => $userId, 'relation' => 'isAllowed', 'attribute' => $action]);
        if ($key === false){
            return true;
        }
        return $this->relationsTable->deleteRow($key);
    }
    
    public function isUserA($userId, $role){
        
        return $this->relationsTable->findRow(['userId' => $userId, 'relation' => 'hasRole', 'attribute' => $role]) !== false;
    }
    
    
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
    
}
