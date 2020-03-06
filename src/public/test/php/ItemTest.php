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

namespace APM;

require "autoload.php";

use APM\Core\Item\MarkType;
use APM\Core\Item\Note;
use PHPUnit\Framework\TestCase;

use APM\Core\Item\TextualItem;
use APM\Core\Item\Mark;
use APM\Core\Item\ItemFactory;
use APM\Core\Item\NoWbMark;
use APM\Core\Item\ChunkMark;
use ThomasInstitut\TimeString\TimeString;

/**
 * Item and descendants class test
 *  
 * As of 2018-10-02, just testing what's needed for 100% coverage
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemTest extends TestCase {
    
   
    
    public function testSimple() {
        $testString = 'some string';
        $testString2 = 'other string';
        $item1 = new TextualItem($testString);
        $this->assertEquals($testString, $item1->getPlainText());
        $this->assertEquals($testString, $item1->getNormalizedText());
        
        $item1->setNormalization($testString2, 'abbr');
        $this->assertEquals($testString2, $item1->getNormalizedText());
        
        $item1->setPlainText('some text');
        
        // Test adding notes
        $exceptionRaised0 = false;
        try {
            $item1->setNotes([1, 2, 3]);
        } catch (\InvalidArgumentException $ex) {
            $exceptionRaised0 = true;
        }
        $this->assertTrue($exceptionRaised0);
        $theNote = new Note('This is a note', 1, TimeString::now());
        $item1->setNotes([$theNote, $theNote, $theNote]);
        $this->assertCount(3, $item1->getNotes());
        
        $item1->addNote($theNote);
        $this->assertCount(4, $item1->getNotes());
        
        
        
        $exceptionRaised1 = false;
        try {
            $item1 = new TextualItem('');
        } catch (\InvalidArgumentException $ex) {
            $exceptionRaised1 = true;
        }
        $this->assertTrue($exceptionRaised1);
        
        $item1->setHand(5);
        $this->assertEquals(5, $item1->getHand());
        
        $item1->setLanguage('la');
        $this->assertEquals('la', $item1->getLanguage());
        
        $item1->setFormat('rubric');
        $this->assertEquals('rubric', $item1->getFormat());
        
        $mark = new  Mark();
        $this->assertEquals('', $mark->getPlainText());
        $this->assertEquals('', $mark->getNormalizedText());
    }
    
    public function testItemFactory() {
        $defaultLang = 'la';
        $defaultHand = 1;
        
        $if = new ItemFactory($defaultLang, $defaultHand);
        
        $item1 = $if->createPlainTextItem('some text');
        
        $this->assertEquals($defaultLang, $item1->getLanguage());
        $this->assertEquals($defaultHand, $item1->getHand());
        $this->assertEquals('some text', $item1->getPlainText());
        $this->assertEquals('some text', $item1->getNormalizedText());
        $this->assertEquals(TextualItem::FORMAT_NONE, $item1->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item1->getTextualFlow());
        
        
        $item2 = $if->createAbbreviationItem('Dr', 'Doctor');
        $this->assertEquals($defaultLang, $item2->getLanguage());
        $this->assertEquals($defaultHand, $item2->getHand());
        $this->assertEquals('Dr', $item2->getPlainText());
        $this->assertEquals('Doctor', $item2->getNormalizedText());
        $this->assertEquals(TextualItem::FORMAT_NONE, $item2->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item2->getTextualFlow());
        
        $item3 = $if->createRubricItem('Some rubric');
        $this->assertEquals($defaultLang, $item3->getLanguage());
        $this->assertEquals($defaultHand, $item3->getHand());
        $this->assertEquals('Some rubric', $item3->getPlainText());
        $this->assertEquals('Some rubric', $item3->getNormalizedText());
        $this->assertEquals(ItemFactory::FORMAT_RUBRIC, $item3->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item3->getTextualFlow());
        
        $item4 = $if->createReferenceMark('someText');
        $this->assertEquals('someText', $item4->getMarkText());
        $this->assertEquals(MarkType::REF, $item4->getMarkType());
        
        $item5 = $if->createParagraphMark();
        $this->assertEquals('', $item5->getMarkText());
        $this->assertEquals(MarkType::PARAGRAPH, $item5->getMarkType());
        
        $item6 = $if->createNoteMark();
        $this->assertEquals('', $item6->getMarkText());
        $this->assertEquals(MarkType::NOTE, $item6->getMarkType());
        
        $item7 = $if->createNoWb();
        $this->assertTrue(is_a($item7, get_class(new NoWbMark())));
        
        $item8 = $if->createCharacterGapItem(5);
        //$this->assertEquals('', $item8->getMarkText());
        $this->assertEquals(MarkType::GAP, $item8->getMarkType());
        $this->assertEquals(5, $item8->getLength());
        
        $item9 = $if->createChunkMark(ChunkMark::TYPE_START, 'AW38', 100, 1);
        $this->assertTrue(is_a($item9, get_class(new ChunkMark('', '', 0, 0))));
        $this->assertEquals(ChunkMark::TYPE_START, $item9->getType());
        $this->assertEquals('AW38', $item9->getWork());
        $this->assertEquals(100, $item9->getChunkNumber());
        $this->assertEquals(1, $item9->getChunkSegment());
                
        
        $item10 = $if->createSicItem('txt', 'text');
        $this->assertEquals('txt', $item10->getPlainText());
        $this->assertEquals('text', $item10->getNormalizedText());
        $this->assertEquals(ItemFactory::NORM_SIC, $item10->getNormalizationType());
        $this->assertEquals(TextualItem::FORMAT_NONE, $item10->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item10->getTextualFlow());
        
        $item11 = $if->createAbbreviationItem('Mr', 'Mister');
        $this->assertEquals('Mr', $item11->getPlainText());
        $this->assertEquals('Mister', $item11->getNormalizedText());
        $this->assertEquals(ItemFactory::NORM_ABBREVIATION, $item11->getNormalizationType());
        $this->assertEquals(TextualItem::FORMAT_NONE, $item11->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item11->getTextualFlow());

        $item12 = $if->createUnclearItem('text', 'damaged', 'textus');
        $this->assertEquals('text', $item12->getPlainText());
        $this->assertEquals(TextualItem::CLARITY_UNCLEAR, $item12->getClarityValue());
        $this->assertEquals('damaged', $item12->getClarityReason());
        $this->assertEquals(TextualItem::FORMAT_NONE, $item12->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item12->getTextualFlow());
        $this->assertCount(1, $item12->getAlternateTexts());
        $this->assertEquals('textus', $item12->getAlternateTexts()[0]);
        
        $item13 = $if->createIllegibleItem(5, 'damaged');
        $this->assertEquals(5, $item13->getLength());
        $this->assertEquals(TextualItem::CLARITY_ILLEGIBLE, $item13->getClarityValue());
        $this->assertEquals('damaged', $item13->getClarityReason());
        $this->assertEquals(TextualItem::FORMAT_NONE, $item13->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item13->getTextualFlow());
        
        $item14 = $if->createMathTextItem('Text');
        $this->assertEquals($defaultLang, $item14->getLanguage());
        $this->assertEquals($defaultHand, $item14->getHand());
        $this->assertEquals('Text', $item14->getPlainText());
        $this->assertEquals('Text', $item14->getNormalizedText());
        $this->assertEquals(ItemFactory::FORMAT_MATH, $item14->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item14->getTextualFlow());
        
        $item15 = $if->createGliphItem('Text');
        $this->assertEquals($defaultLang, $item15->getLanguage());
        $this->assertEquals($defaultHand, $item15->getHand());
        $this->assertEquals('Text', $item15->getPlainText());
        $this->assertEquals('Text', $item15->getNormalizedText());
        $this->assertEquals(ItemFactory::FORMAT_GLIPH, $item15->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item15->getTextualFlow());
        
        $item16 = $if->createInitialItem('Text');
        $this->assertEquals($defaultLang, $item16->getLanguage());
        $this->assertEquals($defaultHand, $item16->getHand());
        $this->assertEquals('Text', $item16->getPlainText());
        $this->assertEquals('Text', $item16->getNormalizedText());
        $this->assertEquals(ItemFactory::FORMAT_INITIAL, $item16->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item16->getTextualFlow());
        
        $item17 = $if->createAdditionItem('addition', 'margin left');
        $this->assertEquals('margin left', $item17->getLocation());
        $this->assertEquals(TextualItem::FLOW_ADDITION, $item17->getTextualFlow());
        $this->assertEquals('addition', $item17->getPlainText());
        $this->assertEquals(TextualItem::FORMAT_NONE, $item17->getFormat());
        
        $item18 = $if->createDeletionItem('deletion', 'strikeout');
        $this->assertEquals('deletion', $item18->getPlainText());
        $this->assertEquals('strikeout', $item18->getDeletion());
        $this->assertEquals(TextualItem::FORMAT_NONE, $item18->getFormat());
        $this->assertEquals(TextualItem::FLOW_MAIN_TEXT, $item18->getTextualFlow());
        
        
    }
        
    
    
}
