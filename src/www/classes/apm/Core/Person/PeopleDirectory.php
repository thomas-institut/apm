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

namespace APM\Core\Person;
/**
 * Basic representation of a people directory.
 * 
 * The basic service of the directory is to take a Person object and 
 * determine useful information about the person, possibly by consulting
 * a database.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class PeopleDirectory {
    
    const LANG_DEFAULT = '';
    
    abstract public function getFullName(Person $person, $lang = self::LANG_DEFAULT) : string;
    abstract public function getInitialAndLastName(Person $person, $lang = self::LANG_DEFAULT) : string;
    abstract public function getInitials(Person $person, $lang = self::LANG_DEFAULT) : string;
    
}
