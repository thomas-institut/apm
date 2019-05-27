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
 * Basic representation of a person: an entity with one or more identifiers
 * of different kinds, e.g. a system id, a url, a full name, etc
 * 
 * The idea is that this class can be the base of more specific classes that
 * can be used together with a PeopleDirectory to get information suitable
 * for data display and export.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Person {
    
    private $ids;
    
    const IDTYPE_NONE = '';
    const IDTYPE_FULLNAME = 'fullName';
    
    const ID_NULL = false;
    
    
    public function __construct(string $idType = self::IDTYPE_NONE, $id = self::ID_NULL) {
        $this->ids = [];
        $this->setId($idType, $id);
    }
    
    public function setId(string $idType, $id) {
        if ($idType === self::IDTYPE_NONE) {
            return false;
        }
        
        if ($id===self::ID_NULL) {
            return false;
        }
        
        $this->ids[$idType] = $id;
    }
    
    public function getId(string $idType) {
        return isset($this->ids[$idType]) ? $this->ids[$idType] : self::ID_NULL;
    }
}
