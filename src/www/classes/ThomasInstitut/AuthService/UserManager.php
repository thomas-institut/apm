<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace ThomasInstitut\AuthService;


abstract class UserManager
{
    /* USER CREATION */

    abstract public function createUser(string $userName, string $personId);

    /* USER INFO */

    abstract public function getUserInfo(string $userName) : array;
    abstract public function getPersonId(string $userName) : string;



    /* ACTIONS, ROLES AND GROUPS */
    abstract public function getActionsAllowed(string $system, string $userName) : array;
    abstract public function setActionsAllowed(string $system, string $userName, array $actions);
    abstract public function isUserAllowed(string $system, string $userName, string $action) : bool;
    abstract public function allowUser(string $system, string $userName, string $action);
    abstract public function disallowUser(string $system, string $userName, string $action);

    abstract public function getRoles(string $system, string $userName) : array;
    abstract public function setRoles(string $system,string $userName, array $roles);
    abstract public function addRole(string $system, string $userName, string $role);
    abstract public function takeRoleAway(string $system, string $userName, string $role);

    abstract public function getGroups(string $system, string $userName) : array;
    abstract public function setGroups(string $system, string $userName, array $groups);
    abstract public function addToGroup(string $system, string $userName, string $group);
    abstract public function removeFromGroup(string $system, string $userName, string $group);

    /* AUTHENTICATION */

    abstract public function setPassword(string $userName, string $password);
    abstract public function verifyPassword(string $username, string $givenPassword);
    abstract public function storeAuthenticationToken(string $system, string $userName, array $tokenData);
    abstract public function getAuthenticationToken(string $system, string $userName) : array;


}