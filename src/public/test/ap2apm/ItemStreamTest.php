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
use AverroesProjectToApm\ItemStream;
use AverroesProject\TxText\Item as APItem;
use AverroesProject\ColumnElement\Element;

/**
 * Description of ItemStreamTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemStreamTest extends TestCase {
    
    public function testConstructorBasic() {
        
        $is = new ItemStream(1, []);
        
        $this->assertEquals([], $is->getItems());
        
        $is2 = new ItemStream(1, [ [], []]);
        $this->assertEquals([], $is2->getItems());
    }
    
    public function testTextualItems() {
        $textualItemClass = get_class(new Core\Item\TextualItem('stub'));
        
        $ceId = 500;
        $initialItemId = 100;
        $pageId = 100;
        
        $itemId = $initialItemId;
        $itemSeq = 0;
        $inputRows = [
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::TEXT, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::RUBRIC, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::GLIPH, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::GLIPH, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::MATH_TEXT, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ], 
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::SIC, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> 'some other text', 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ], 
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::ABBREVIATION, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> 'some other text', 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::UNCLEAR, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> 'some other text', 'extra_info' => 'unclear reason', 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::ADDITION, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => 'location', 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::DELETION, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => 'deletion technique', 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::INITIAL, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::ILLEGIBLE, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => 'illegible reason', 
                'length' => 5, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::LINEBREAK, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            
        ];
        
        $is = new ItemStream(1,[$inputRows]);
        $items = $is->getItems();
        
        $this->assertCount(13, $items);
        foreach($items as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $textualItemClass ));
        }
        
        foreach($inputRows as &$row) {
            $row['e.type']  = Element::ADDITION;
            $row['placement'] = 'margin left';
        }
        $is2 = new ItemStream(1,[$inputRows]);
        $items2 = $is2->getItems();
        
        $this->assertCount(13, $items2);
        foreach($items2 as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $textualItemClass ));
        }
        
        foreach($inputRows as &$row) {
            $row['e.type']  = Element::GLOSS;
            $row['placement'] = 'margin left';
        }
        $is3 = new ItemStream(1,[$inputRows]);
        $items3 = $is3->getItems();
        
        $this->assertCount(13, $items3);
        foreach($items3 as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $textualItemClass ));
        }
        
        
        foreach($inputRows as &$row) {
            $row['e.type']  = Element::SUBSTITUTION;
            $row['placement'] = 'margin left';
        }
        $is4 = new ItemStream(1,[$inputRows]);
        $items4 = $is4->getItems();
        
        $this->assertCount(13, $items4);
        foreach($items4 as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $textualItemClass ));
        }
    }
    
     public function testMarkItems() {
        $markItemClass = get_class(new Core\Item\Mark());
        
        $inputRows = [
            [
                'id' => 100, 'seq' => 0, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::MARK, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => 101, 'seq' => 1, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::NO_WORD_BREAK, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => 102, 'seq' => 2, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::CHUNK_MARK, 'text' => 'AW47',
                'lang' => 'la', 'alt_text'=> 'start', 'extra_info' => null, 
                'length' => 1, 'target' => 1, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => 103, 'seq' => 3, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::CHARACTER_GAP, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => 5, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => 104, 'seq' => 4, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::PARAGRAPH_MARK, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ], 
            [
                'id' => 105, 'seq' => 5, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => APItem::MARGINAL_MARK, 'text' => 'Ref',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ]
        ];
        
        $is = new ItemStream(1,[$inputRows]);
        $items = $is->getItems();
        
        $this->assertCount(6, $items);
        foreach($items as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $markItemClass ));
        }
        
    }
}
