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

require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;

use APM\Core\Person\Person;

/**
 * Description of PersonTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PersonTest extends TestCase {
    
    public function testSimple() {
        $p = new Person();
        
        $this->assertEquals(Person::ID_NULL, $p->getId('some id'));
        
        $this->assertFalse($p->setId(Person::IDTYPE_NONE, ''));
        $this->assertFalse($p->setId(Person::IDTYPE_FULLNAME, Person::ID_NULL));
        
        
    }
}
