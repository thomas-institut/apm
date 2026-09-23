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

namespace APM\System\Transcription;



use APM\Core\Item\Mark;
use APM\Core\Item\TextualItem;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TxText\Item;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;


/**
 * Description of ItemStreamTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
#[CoversClass(DatabaseItemStream::class)]
class DatabaseItemStreamTest extends TestCase {
    
    #[Test]
    public function testConstructorBasic() {
        
        $is = new DatabaseItemStream(1, []);
        
        $this->assertEquals([], $is->getItems());
        
        $is2 = new DatabaseItemStream(1, [ [], []]);
        $this->assertEquals([], $is2->getItems());
    }

    #[Test]
    public function testTextualItems() {
        $textualItemClass = TextualItem::class;
        
        $ceId = 500;
        $initialItemId = 100;
        $pageId = 100;
        
        $itemId = $initialItemId;
        $itemSeq = 0;
        $inputRows = [
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::TEXT, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::RUBRIC, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::GLIPH, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::GLIPH, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::MATH_TEXT, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ], 
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::SIC, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> 'some other text', 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ], 
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::ABBREVIATION, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> 'some other text', 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::UNCLEAR, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> 'some other text', 'extra_info' => 'unclear reason', 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::ADDITION, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => 'location', 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::DELETION, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => 'deletion technique', 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::INITIAL, 'text' => 'Some text',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId++, 'seq' => $itemSeq++, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::ILLEGIBLE, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => 'illegible reason', 
                'length' => 5, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => $itemId, 'seq' => $itemSeq, 'ce_id' => $ceId, 'e.seq' => 0, 'col' => 1, 'page_id' => $pageId, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::LINEBREAK, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            
        ];
        
        $is = new DatabaseItemStream(1,[$inputRows]);
        $items = $is->getItems();
        
        $this->assertCount(13, $items);
        $index = $initialItemId;
        foreach($items as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $textualItemClass ));
            $this->assertEquals($index, $itemInStream->getAddress()->getItemIndex());
            $index++;
        }
        
        foreach($inputRows as &$row) {
            $row['e.type']  = Element::ADDITION;
            $row['placement'] = 'margin left';
        }
        $is2 = new DatabaseItemStream(1,[$inputRows]);
        $items2 = $is2->getItems();
        
        $this->assertCount(13, $items2);
        foreach($items2 as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $textualItemClass ));
        }
        
        foreach($inputRows as &$row) {
            $row['e.type']  = Element::GLOSS;
            $row['placement'] = 'margin left';
        }
        $is3 = new DatabaseItemStream(1,[$inputRows]);
        $items3 = $is3->getItems();
        
        $this->assertCount(13, $items3);
        foreach($items3 as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $textualItemClass ));
        }
        
        
        foreach($inputRows as &$row) {
            $row['e.type']  = Element::SUBSTITUTION;
            $row['placement'] = 'margin left';
        }
        $is4 = new DatabaseItemStream(1,[$inputRows]);
        $items4 = $is4->getItems();
        
        $this->assertCount(13, $items4);
        foreach($items4 as $itemInStream) {
            $this->assertTrue(is_a($itemInStream->getItem(), $textualItemClass ));
        }
    }

    #[Test]
     public function testMarkItems() {

        $inputRows = [
            [
                'id' => 100, 'seq' => 0, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::MARK, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => 101, 'seq' => 1, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::NO_WORD_BREAK, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => 102, 'seq' => 2, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::CHUNK_MARK, 'text' => 'AW47',
                'lang' => 'la', 'alt_text'=> 'start', 'extra_info' => null, 
                'length' => 1, 'target' => 1, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => 103, 'seq' => 3, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::CHARACTER_GAP, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => 5, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ],
            [
                'id' => 104, 'seq' => 4, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::PARAGRAPH_MARK, 'text' => null,
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ], 
            [
                'id' => 105, 'seq' => 5, 'ce_id' => 500, 'e.seq' => 0, 'col' => 1, 'page_id' => 100, 'p.seq' => '1', 'foliation' => null,
                'type' => Item::MARGINAL_MARK, 'text' => 'Ref',
                'lang' => 'la', 'alt_text'=> null, 'extra_info' => null, 
                'length' => null, 'target' => null, 'hand' => 0, 
                'e.type' => Element::LINE, 'placement' => null
            ]
        ];
        
        $is = new DatabaseItemStream(1,[$inputRows]);
        $items = $is->getItems();
        
        $this->assertCount(6, $items);
        foreach($items as $itemInStream) {
            $this->assertInstanceOf(Mark::class, $itemInStream->getItem());
        }
        
    }
}
