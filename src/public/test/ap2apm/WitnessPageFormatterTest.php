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

use APM\Core\Item\Item;
use AverroesProjectToApm\AddressInItemStream;
use AverroesProjectToApm\ItemStream;
use AverroesProjectToApm\ItemInItemStream;

/**
 * For now this is just to hit a couple of format cases that 
 * can't be hit easily with APM items 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class WitnessPageFormatterTest extends TestCase {
    
    function testMarksWithinGlosses() {
        
        $mark = new Core\Item\Mark('test', 'some text');
        $mark->setTextualFlow(Item::FLOW_GLOSS);
        $address = new AddressInItemStream();
        
        $itemStream = new ItemStream(1, []);
        $itemStream->addItem(new ItemInItemStream($address, $mark));
        
        $formatter = new \AverroesProjectToApm\Formatter\WitnessPageFormatter();
        
        $html = $formatter->formatItemStream($itemStream);
        
        $this->assertNotEquals('', $html);
    }
    
}
