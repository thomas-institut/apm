<?php
/*
 * 
 * Copyright (C) 2018 Universität zu Köln
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

use AverroesProjectToApm\PageTranscriptionConverterBasic;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Line;
use AverroesProject\TxText\Text;

/**
 * PageTranscriptionConverter test
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PageTranscriptionConverterTest extends TestCase {
    
    public function testSimplePage() {
        $numElements = 5;
        $userId  = 100;
        $pageId = 100;
        $handId = 0;
        $columnNumber = 1;
        $lang = 'la';
        
        $elements = [];
        
        for($i=0; $i < $numElements; $i++) {
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = $columnNumber;
            $element->editorId = $userId;
            $element->lang = 'la';
            $element->handId = $handId;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text($i+1,0,"Original Line ". (string)($i+1)));
            $elements[] = $element;
        }
        
        $converter = new PageTranscriptionConverterBasic();
        
        $pt = $converter->convert($elements);
        
        $this->assertEquals(1, $pt->getTextBoxCount());
        $columnTb = $pt->getTextBoxByIndex(0);
        $this->assertTrue($columnTb->isMainText());
        $tbItems = $columnTb->getItems();
        $this->assertCount(2*$numElements, $tbItems);
    }
  
}
