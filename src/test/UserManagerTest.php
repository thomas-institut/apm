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

require 'UserManagerWithTables.php';
/**
 * Description of UserManagerTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class UserManagerTest extends PHPUnit_Framework_TestCase {
    
    private $numUsers = 1000;
    
    public function testUserCreation(){
        $um = new AverroesProject\UserManagerWithTables();
        
        // Number of users to generate
        
        // A semi-stress test
        for ($i = 1; $i <= $this->numUsers; $i++){
            $someUserName = 'someUser' . $i;
            $this->assertSame(false, $um->userExistsByUserName($someUserName));
            $theNewId = $um->createUserByUsername($someUserName);
            $this->assertNotSame(false, $theNewId);
        
            $theNewId2 = $um->createUserByUsername($someUserName);
            $this->assertSame(false, $theNewId2);
        
            $this->assertSame($theNewId, $um->getUserIdFromUserName($someUserName));

            $this->assertSame(true, $um->setUserRole($theNewId, 'role1'));
            $this->assertSame(true, $um->setUserRole($theNewId, 'role2'));
            $this->assertSame(true, $um->isUserA($theNewId, 'role1'));
            $this->assertSame(true, $um->isUserA($theNewId, 'role2'));
            $this->assertSame(false, $um->isUserA($theNewId, 'role3'));
            $this->assertSame(true, $um->setUserRole($theNewId, 'role3'));
            $this->assertSame(true, $um->revokeUserRole($theNewId, 'role3'));
            
            $this->assertSame(false, $um->isRoot($theNewId));
            $this->assertSame(true, $um->makeRoot($theNewId));
            $this->assertSame(true, $um->isRoot($theNewId));
            $this->assertSame(true, $um->revokeRootStatus($theNewId));
            $this->assertSame(false, $um->isRoot($theNewId));
        }
        
        return $um;
    }
     
    /**
     * @depends testUserCreation
     */
    public function testExistentUserSearches($um){
        // random searches, existent users
        
        for ($i = 0 ; $i < 1000; $i++){
            $someUserName = 'someUser' . rand(1, $this->numUsers);
            $testMsg = "Testing with user $someUserName, iteration $i";
                     
            $this->assertSame(true, $um->userExistsByUserName($someUserName), $testMsg);
            $this->assertSame(false, $um->isRoot($someUserName), $testMsg);
            $theUserId = $um->getUserIdFromUserName($someUserName);
            $this->assertSame(true, $um->isUserA($theUserId, 'role1'), $testMsg);
            $this->assertSame(true, $um->isUserA($theUserId, 'role2'), $testMsg);
            $this->assertSame(false, $um->isUserA($theUserId, 'role3'), $testMsg);
        }
        
        return $um;
    }
    
    /**
     * @depends testUserCreation
     */
    public function testNonExistentUserSearches($um){
        
        // random searches, non existent users
        for ($i = 0 ; $i < 1000; $i++){
            $someUserName = 'someUser' . rand($this->numUsers+1, 10*$this->numUsers);
            $testMsg = "Testing with user $someUserName, iteration $i";
            $this->assertSame(false, $um->userExistsByUserName($someUserName), $testMsg);
            $theUserId = $um->getUserIdFromUserName($someUserName);
            $this->assertSame(false, $theUserId);
            $this->assertSame(false, $um->isRoot($someUserName), $testMsg);
        }
        
        return $um;
    }
    
}
