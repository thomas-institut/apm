<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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


use APM\ToolBox\FullName;
use ThomasInstitut\UserManager\PersonInfoProvider;

class UserManagerUserInfoProvider implements PersonInfoProvider
{

    /**
     * @var UserManager
     */
    private $userManager;

    public function __construct(UserManager $um)
    {
        $this->userManager = $um;
    }

    public function getFullNameFromId(int $id): string
    {
        $userInfo = $this->userManager->getUserInfoByUserId($id);
        return $userInfo['fullname'];
    }

    public function getShortNameFromId(int $id): string
    {
        $fullName = $this->getFullNameFromId($id);
        return FullName::getShortName($fullName);
    }
}