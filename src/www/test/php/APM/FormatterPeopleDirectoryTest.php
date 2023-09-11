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
namespace Test\APM;


use PHPUnit\Framework\TestCase;

use APM\Core\Person\FormatterPeopleDirectory;
use APM\Core\Person\Person;

/**
 * Description of PersonTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class FormatterPeopleDirectoryTest extends TestCase {
    
    public function testSimple() {
        
        $pd = new FormatterPeopleDirectory();
        
        $unknownPerson = new Person();
        
        $unknownFullName = $pd->getFullName($unknownPerson);
        $unknownInitials = $pd->getInitials($unknownPerson);
        $unknownInitials2 = $pd->getInitialAndLastName($unknownPerson);
        $this->assertEquals(FormatterPeopleDirectory::NAME_UNKNOWN_DEFAULT, $unknownFullName);
        $this->assertEquals(FormatterPeopleDirectory::NAME_UNKNOWN_DEFAULT, $unknownInitials);
        $this->assertEquals(FormatterPeopleDirectory::NAME_UNKNOWN_DEFAULT, $unknownInitials2);
        
        $p = new Person(Person::IDTYPE_FULLNAME, 'Jon Snow');
        
        $this->assertEquals('Jon Snow', $pd->getFullName($p));
        $this->assertEquals('J. Snow', $pd->getInitialAndLastName($p));
        $this->assertEquals('JS', $pd->getInitials($p));
        
        $p2 = new Person(Person::IDTYPE_FULLNAME, 'Ludwig van Beethoven');
        
        $this->assertEquals('Ludwig van Beethoven', $pd->getFullName($p2));
        $this->assertEquals('L. van Beethoven', $pd->getInitialAndLastName($p2));
        $this->assertEquals('LvB', $pd->getInitials($p2));
        
        $p3 = new Person(Person::IDTYPE_FULLNAME, 'Madonna');
        
        $this->assertEquals('Madonna', $pd->getFullName($p3));
        $this->assertEquals('Madonna', $pd->getInitialAndLastName($p3));
        $this->assertEquals('M', $pd->getInitials($p3));
        
    }
}
