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


use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

use APM\Core\Item\Note;

/**
 * Description of NoteTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class NoteTest extends TestCase {
    
    public function testSimple() {
        
        $note1 = new Note();
        
        
        $this->assertEquals(Note::DEFAULT_AUTHOR_TID, $note1->getAuthorTid());
        $this->assertEquals(Note::DEFAULT_TEXT, $note1->getText());
        $this->assertEquals(Note::DEFAULT_TIMESTAMP, $note1->getTimestamp());
        
        $exceptionThrown = false;
        try {
            $note1->setText('');
        } catch (InvalidArgumentException $ex) {
            $exceptionThrown = true;
        }
        
        $this->assertTrue($exceptionThrown);
        
        $note1->setText('Some text');
        $this->assertEquals('Some text', $note1->getText());
        
        
    }
}
