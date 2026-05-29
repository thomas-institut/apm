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
use APM\ToolBox\FullName;

/**
 * A people directory that gets all info out of a full name, without
 * consulting any external resource
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class FormatterPeopleDirectory extends PeopleDirectory {
    
    const NAME_UNKNOWN_DEFAULT = 'Unknown';
    
    public function getFullName(Person $person, $lang = self::LANG_DEFAULT): string {
        $fullName = $person->getId(Person::IDTYPE_FULLNAME);
        if ($fullName === Person::ID_NULL) {
            return self::NAME_UNKNOWN_DEFAULT;
        }
        return $fullName;
    }

    public function getInitialAndLastName(Person $person, $lang = self::LANG_DEFAULT): string {
        $fullName = $person->getId(Person::IDTYPE_FULLNAME);
        if ($fullName === Person::ID_NULL) {
            return self::NAME_UNKNOWN_DEFAULT;
        }
       return FullName::getShortName($fullName);
    }

    public function getInitials(Person $person, $lang = self::LANG_DEFAULT): string {
        $fullName = $person->getId(Person::IDTYPE_FULLNAME);
        if ($fullName === Person::ID_NULL) {
            return self::NAME_UNKNOWN_DEFAULT;
        }
        
        $analyzedFullName = $this->analyzeFullName($fullName);
        
        $subStrings = [];
        foreach($analyzedFullName['firstNames'] as $firstName) {
            $subStrings[] = $this->getInitial($firstName);
        }
        
        foreach($analyzedFullName['lastNames'] as $lastName) {
            $subStrings[] = $this->getInitial($lastName);
        }
        
        return implode('', $subStrings);
    }
    
    /**
     * Splits a full name into first and last names taking care of some
     * language conventions
     * 
     * @param string $fullName
     * @return array
     */
    public function analyzeFullName(string $fullName) : array {
      return FullName::analyze($fullName);
    }
    
    private function getInitial(string $name) : string {
       return FullName::getWordInitials($name);
    }

}
