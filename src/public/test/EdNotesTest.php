<?php
/*
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */
namespace AverroesProject;
require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
/**
 * Description of ItemsTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class EdNotesTest extends TestCase {
    
    public function testConstruct()
    {
        $edNote = new EditorialNote();
        
        $this->assertEquals(EditorialNote::INLINE, $edNote->type);
    }
    
    public function testConstructFromArray()
    {
        // wrong type
        $array1 = [ 
            'type' => 100
        ];
        
        $this->assertFalse(EditorialNote::constructEdNoteFromRow($array1));
        
        // no type
        $array2 = [ 
            'id' => 100,
            'lang' => 'fr',
            'target' => 1500,
            'time' => '2017-01-02'
        ];
        $this->assertFalse(EditorialNote::constructEdNoteFromRow($array2));
        
        // minimal array
        $array3 = [ 
            'type' => EditorialNote::OFFLINE
        ];
        
        $defaultEdNote = new EditorialNote();
        $builtEdNote = EditorialNote::constructEdNoteFromRow($array3);
        $this->assertNotFalse($builtEdNote);
        
        $defaultEdNote->setType(EditorialNote::OFFLINE);
        
        $this->assertEquals($defaultEdNote, $builtEdNote);
        
        
        // good array
        $array4 = [ 
            'id' => '100',
            'type' => EditorialNote::OFFLINE,
            'author_id' => 500,
            'lang' => 'fr',
            'target' => 1500,
            'time' => '2017-01-02',
            'text' => '   sometext'
        ];
        $builtEdNote = EditorialNote::constructEdNoteFromRow($array4);
        $this->assertNotFalse($builtEdNote);
        
        $this->assertSame(100, $builtEdNote->id);
        $this->assertSame(500, $builtEdNote->authorId);
        $this->assertSame(1500, $builtEdNote->target);
        $this->assertEquals('sometext', $builtEdNote->text);
    }
    
    
}
