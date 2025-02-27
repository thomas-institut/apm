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

namespace APM\Test\Api;


use APM\Api\ItemStreamFormatter\WitnessPageFormatter;
use APM\Core\Item\Mark;
use APM\System\Transcription\AddressInDatabaseItemStream;
use APM\System\Transcription\DatabaseItemStream;
use APM\System\Transcription\EditorialNote;
use APM\System\Transcription\ItemInDatabaseItemStream;
use PHPUnit\Framework\TestCase;

use APM\Core\Item\Item;


/**
 * For now this is just to hit a couple of format cases that 
 * can't be hit easily with APM items 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class WitnessPageFormatterTest extends TestCase {
    
    function testMarksWithinGlosses() {
        $docId = 1;
        $itemId = 100;
        $mark = new Mark('test', 'some text');
        $mark->setTextualFlow(Item::FLOW_GLOSS);
        $address = new AddressInDatabaseItemStream();
        $address->setFromItemStreamRow($docId, ['id' => $itemId, 'seq'=> 0, 'ce_id' => 0, 'e.seq' => 0, 'col' => 1, 'page_id' => 20, 'p.seq' => 1, 'foliation' => null]);
        
        $itemStream = new DatabaseItemStream($docId, []);
        $itemStream->addItem(new ItemInDatabaseItemStream($address, $mark));

        $formatter = new WitnessPageFormatter();
        
        $html = $formatter->formatItemStream($itemStream);
        
        $this->assertNotEquals('', $html);
    }
    
    function testNoteMarks() {
        $itemId = 100;
        $docId = 1;
        $authorId = 9989;
        $time= '2018-11-30 15:01:00';
        $noteText = 'This is a note';
        
        $noteMark = new Mark('note');
        $address = new AddressInDatabaseItemStream();
        $address->setFromItemStreamRow($docId, ['id' => $itemId, 'seq'=> 0, 'ce_id' => 0, 'e.seq' => 0, 'col' => 1, 'page_id' => 20, 'p.seq' => 1, 'foliation' => null]);
        
        $edNote = new EditorialNote();
        $edNote->target = $itemId;
        $edNote->authorTid = $authorId;
        $edNote->time = $time;
        $edNote->text = $noteText;
        
        $edNote2 = clone $edNote;
        $edNote2->authorTid = 12323;
        
        $edNote3 = clone $edNote;
        $edNote3->target = $itemId+1;
        
        $itemStream = new DatabaseItemStream(1, []);
        $itemStream->addItem(new ItemInDatabaseItemStream($address, $noteMark));
        
        $formatter = new WitnessPageFormatter();
        
        $html = $formatter->formatItemStream($itemStream);
        
        //print "html = '$html'\n";
        $this->assertNotEquals('', $html);
        
        
    }
    
}
