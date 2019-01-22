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

namespace APM;

require "../vendor/autoload.php";

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
        $this->assertEquals('J. S.', $pd->getInitials($p));
        
        $p2 = new Person(Person::IDTYPE_FULLNAME, 'Ludwig van Beethoven');
        
        $this->assertEquals('Ludwig van Beethoven', $pd->getFullName($p2));
        $this->assertEquals('L. van Beethoven', $pd->getInitialAndLastName($p2));
        $this->assertEquals('L. v.', $pd->getInitials($p2));  //  <--- THIS IS WRONG!
        
        $p3 = new Person(Person::IDTYPE_FULLNAME, 'Madonna');
        
        $this->assertEquals('Madonna', $pd->getFullName($p3));
        $this->assertEquals('Madonna', $pd->getInitialAndLastName($p3));
        $this->assertEquals('M.', $pd->getInitials($p3));
        
    }
}
