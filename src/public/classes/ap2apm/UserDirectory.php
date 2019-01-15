<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace AverroesProjectToApm;


use APM\Core\Person\PeopleDirectory;
use APM\Core\Person\FormatterPeopleDirectory;
use APM\Core\Person\Person;

use AverroesProject\Data\UserManager;

/**
 * A user directory using current AverrroesProject user manager
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class UserDirectory extends PeopleDirectory {
    
    const IDTYPE_AP_PERSON_ID = 'ap_person_id';
    
    private $formatterPd;
    private $um;


    public function __construct(UserManager $um) {
        $this->formatterPd = new FormatterPeopleDirectory();
        $this->um = $um;
    }

    public function getFullName(Person $person, $lang = self::LANG_DEFAULT): string {
       return $this->formatterPd->getFullName($this->withFullName($person), $lang);
    }

    public function getInitialAndLastName(Person $person, $lang = self::LANG_DEFAULT): string {
       return $this->formatterPd->getInitialAndLastName($this->withFullName($person), $lang); 
    }

    public function getInitials(Person $person, $lang = self::LANG_DEFAULT): string {
       return $this->formatterPd->getInitials($this->withFullName($person), $lang);
    }
    
    private function withFullName(Person $personTochange) : Person {
        $person = clone $personTochange;
        
        $userId = $person->getId(self::IDTYPE_AP_PERSON_ID);
        if ($userId === Person::ID_NULL) {
            // no id found, return with no change
            return $person;
        }
            
        $userInfo = $this->um->getUserInfoByUserId($userId);
        
        if ($userInfo === false) {
            // no user info found, return with no change
            return $person;
        }
        
        $person->setId(Person::IDTYPE_FULLNAME, $userInfo['fullname']);
        
        return $person;
    }

}
