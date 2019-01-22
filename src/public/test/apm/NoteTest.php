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

use APM\Core\Item\Note;

/**
 * Description of NoteTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class NoteTest extends TestCase {
    
    public function testSimple() {
        
        $note1 = new Note();
        
        
        $this->assertEquals(Note::AUTHOR_UNDEFINED, $note1->getAuthor());
        $this->assertEquals(Note::TEXT_NOTEXT, $note1->getText());
        
        $now = time();
        $this->assertTrue($now >= $note1->getTime());
        
        $exceptionThrown = false;
        
        try {
            $note1->setText('');
        } catch (\InvalidArgumentException $ex) {
            $exceptionThrown = true;
        }
        
        $this->assertTrue($exceptionThrown);
        
        $note1->setText('Some text');
        $this->assertEquals('Some text', $note1->getText());
        
        
    }
}
