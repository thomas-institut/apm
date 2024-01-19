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

namespace ThomasInstitut\AuthService;

/**
 * Interface PersonInfoProvider
 *
 * An interface that provides get methods for different kinds of data related to a Person
 *
 * Persons are ident
 * @package ThomasInstitut\AuthenticationService
 */

interface PersonInfoProvider
{
    /**
     * Returns the normalized version of a person's name
     * @param int $personTid
     * @return string
     */
    public function getNormalizedName(int $personTid) : string;

    /**
     * Returns a short version of a person's name.
     * Normally this is the given name initial and the last name
     * e.g. "J. Smith"  for "Joseph Smith" but it could be something else
     * like "Arist."  for "Aristotle"
     * @param int $personTid
     * @return string
     */
    public function getShortName(int $personTid) : string;

}