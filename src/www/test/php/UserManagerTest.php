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

namespace APM;

require "autoload.php";

use PHPUnit\Framework\TestCase;
use AverroesProject\Data\UserManager;
/**
 * Description of UserManagerTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class UserManagerTest extends TestCase {
    
    // Number of users to generate
    private $numUsers = 10;
    
    public function testUserCreation()
    {
        $um = new UserManager();
        
        // A semi-stress test
        for ($i = 1; $i <= $this->numUsers; $i++) {
            $someUserName = 'someUser' . $i;
            $this->assertFalse($um->userExistsByUserName($someUserName));
            $theNewId = $um->createUserByUsername($someUserName);
            $this->assertNotSame(false, $theNewId);
        
            $theNewId2 = $um->createUserByUsername($someUserName);
            $this->assertFalse($theNewId2);
        
            $this->assertSame($theNewId, 
                    $um->getUserIdFromUserName($someUserName));

            $this->assertTrue($um->setUserRole($theNewId, 'role1'));
            $this->assertTrue($um->setUserRole($theNewId, 'role2'));
            $this->assertTrue($um->userHasRole($theNewId, 'role1'));
            $this->assertTrue($um->userHasRole($theNewId, 'role2'));
            $this->assertFalse($um->userHasRole($theNewId, 'role3'));
            $this->assertTrue($um->setUserRole($theNewId, 'role3'));
            $this->assertTrue($um->revokeUserRole($theNewId, 'role3'));
            
            // Root
            $this->assertFalse($um->isRoot($theNewId));
            $this->assertTrue($um->makeRoot($theNewId));
            $this->assertTrue($um->isRoot($theNewId));
            $this->assertTrue($um->isUserAllowedTo($theNewId, 'someaction'));
            $this->assertTrue($um->allowUserTo($theNewId, 'someaction'));
            $this->assertFalse($um->disallowUserTo($theNewId, 'someaction'));
            $this->assertTrue($um->setUserRole($theNewId, 'somerole'));
            $this->assertFalse($um->revokeUserRole($theNewId, 'somerole'));
            $this->assertTrue($um->revokeRootStatus($theNewId));
            $this->assertFalse($um->isRoot($theNewId));
            
            $this->assertFalse($um->isUserAllowedTo($theNewId, 
                    'someaction'));
            $this->assertTrue($um->allowUserTo($theNewId,'someaction'));
            $this->assertTrue($um->isUserAllowedTo($theNewId, 
                    'someaction'));
            $this->assertTrue($um->disallowUserTo($theNewId,
                    'someaction'));
            $this->assertFalse($um->isUserAllowedTo($theNewId, 
                    'someaction'));
        }
        
        return $um;
    }

    /**
     * @depends testUserCreation
     * @param UserManager $um
     * @return UserManager
     */
    public function testExistentUserSearches(UserManager $um)
    {
        // random searches, existent users
        
        for ($i = 0 ; $i < $this->numUsers; $i++){
            $someUserName = 'someUser' . rand(1, $this->numUsers);
            $testMsg = "Testing with user $someUserName, iteration $i";
                     
            $this->assertTrue($um->userExistsByUserName($someUserName), 
                    $testMsg);
            $theUserId = $um->getUserIdFromUserName($someUserName);
            $this->assertTrue($um->userHasRole($theUserId, 'role1'), 
                    $testMsg);
            $this->assertTrue($um->userHasRole($theUserId, 'role2'), 
                    $testMsg);
            $this->assertFalse($um->userHasRole($theUserId, 'role3'), 
                    $testMsg);
        }
        return $um;
    }

    /**
     * @depends testUserCreation
     * @param UserManager $um
     * @return UserManager
     */
    public function testNonExistentUserSearches(UserManager $um)
    {
        // random searches, non existent users
        for ($i = 0 ; $i < $this->numUsers; $i++) {
            $someUserName = 'someUser' . rand($this->numUsers+1, 
                    10*$this->numUsers);
            $testMsg = "Testing with user $someUserName, iteration $i";
            $this->assertFalse($um->userExistsByUserName($someUserName), 
                    $testMsg);
            $theUserId = $um->getUserIdFromUserName($someUserName);
            $this->assertFalse($theUserId);
        }
        return $um;
    }
    
    public function testNonExistentUsers()
    {
        $um = new UserManager();
        
        for ($i = 0; $i < 10; $i++) {
            $this->assertFalse($um->getUserInfoByUserId($i));
            $this->assertFalse($um->getUserInfoByUserId($i));
            $this->assertFalse($um->getUsernameFromUserId($i));
            $this->assertFalse($um->updateUserInfo($i, 'Some name', 
                    'some@email.com'));
            $this->assertFalse($um->setUserRole($i, 'somerole'));
            $this->assertFalse($um->revokeUserRole($i, 'somerole'));
            $this->assertFalse($um->allowUserTo($i, 'someaction'));
            $this->assertFalse($um->disallowUserTo($i, 'someaction'));
        }
        $this->assertFalse($um->storeUserPassword('somename', 'password'));
        $this->assertFalse($um->verifyUserPassword('somename', 'password'));
    }
    
    public function testUserSettings()
    {
        $um = new UserManager();
        
        $userId = $um->createUserByUsername('test');
        $this->assertEquals($userId, $um->getUserIdFromUserName('test'));
        $this->assertTrue($um->userExistsById($userId));
        
        $expectedUserInfo = [
            'id' => $userId,
            'username' => 'test',
            'fullname' => '',
            'email' => '',
            'emailhash' => ''
        ];
        
        $this->assertEquals($expectedUserInfo, 
                $um->getUserInfoByUserId($userId));
        
        $this->assertEquals($expectedUserInfo, 
                $um->getUserInfoByUsername('test'));
        
        $this->assertFalse($um->updateUserInfo($userId, ''));
        $this->assertTrue($um->updateUserInfo($userId, 'Name', 'email'));
        $ui = $um->getUserInfoByUserId($userId);
        $this->assertEquals('Name', $ui['fullname']);
        $this->assertEquals('email', $ui['email']);
        $this->assertNotEquals('', $ui['emailhash']);
        
        // Password
        $this->assertFalse($um->verifyUserPassword('test', 'somepassword'));
        $this->assertFalse($um->storeUserPassword('test', ''));
        $this->assertTrue($um->storeUserPassword('test', 'thepass'));
        $this->assertFalse($um->verifyUserPassword('test', ''));
        $this->assertFalse($um->verifyUserPassword('test', 'wrongpass'));
        $this->assertTrue($um->verifyUserPassword('test', 'thepass'));
        
        // All user info
        $allUi = $um->getUserInfoForAllUsers();
        $this->assertCount(1, $allUi);
        $this->assertEquals($ui, $allUi[0]);
        
        // Revoking permissions that the user does not have
        $this->assertTrue($um->disallowUserTo($userId, 'someaction'));
        $this->assertTrue($um->revokeUserRole($userId, 'somerole'));
    }
    
    
    public function testTokenOperations()
    {
        //$ipAddresses = ['10.0.0.1', '192.168.1.1', '123.123.123.123'];
        $userAgents = ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36', 
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:54.0) Gecko/20100101 Firefox/54.0'];
        $um = new UserManager();
        
        $userId = $um->createUserByUsername('test');
        $this->assertEquals($userId, $um->getUserIdFromUserName('test'));
        $this->assertTrue($um->userExistsById($userId));
        
        //foreach($ipAddresses as $ipAddress) {
        $ipAddress = 'anything';   // ignoring ip address for now
            foreach($userAgents as $userAgent) {
                $this->assertEquals('', $um->getUserToken($userId, $userAgent));
                $token1 = 'token1-' . $ipAddress . '-' . $userAgent;
                $this->assertTrue($um->storeUserToken($userId, $userAgent, $ipAddress, $token1));
                $this->assertEquals($token1, $um->getUserToken($userId, $userAgent));
            }
        //}
        
    }
}
