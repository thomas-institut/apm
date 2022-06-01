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

namespace ThomasInstitut\UserManager;


/**
 * Interface PersonInfoStore
 *
 * @package ThomasInstitut\UserManager
 */
interface PersonInfoContainer
{
    /**
     * Returns the value for the given key for the given person Id
     * @param string $personId
     * @param string $key
     * @return string
     */
    public function get(string $personId, string $key) : string;

    /**
     * Returns an array with all the information available for
     * the given person
     * @param string $personId
     * @return array
     */
    public function getAllInfo(string $personId) : array;
}