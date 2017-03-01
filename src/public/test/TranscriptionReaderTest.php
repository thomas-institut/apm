<?php

/*
 *  Copyright (C) 2016 Universität zu Köln
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
use AverroesProject\Xml\TranscriptionReader;
use AverroesProject\EditorialNote;

/**
 * Description of TranscriptionReaderTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TranscriptionReaderTest extends TestCase {
     
       
    public function testNotValidFiles(){
        $tsReader = new TranscriptionReader();

        $xml = file_get_contents('test-transcriptions/testNotValid01.xml');
        $result = $tsReader->read($xml);
        $this->assertEquals(false, $result);
        $this->assertEquals(TranscriptionReader::ERROR_NOT_TEI, 
                $tsReader->errorNumber);


        $xml2 = file_get_contents("test-transcriptions/testNotValid02.xml");
        $tsReader->reset();
        $result2 =  $tsReader->read($xml2);
        $this->assertEquals(false, $result2);
        $this->assertEquals(TranscriptionReader::ERROR_INCORRECT_STRUCTURE, 
                $tsReader->errorNumber);

        $xml3 = file_get_contents("test-transcriptions/testNotValid03.xml");
        $tsReader->reset();
        $result3 =  $tsReader->read($xml3);
        $this->assertEquals(false, $result3);
        $this->assertEquals(TranscriptionReader::ERROR_INCORRECT_STRUCTURE, 
                $tsReader->errorNumber);
        
        $xml4 = file_get_contents("test-transcriptions/testNotValid04.xml");
        $tsReader->reset();
        $result4 =  $tsReader->read($xml4);
        $this->assertEquals(false, $result4);
        $this->assertEquals(TranscriptionReader::ERROR_INCORRECT_STRUCTURE, 
                $tsReader->errorNumber);
        
        $xml5 = file_get_contents("test-transcriptions/testNotValid05.xml");
        $tsReader->reset();
        $result5 =  $tsReader->read($xml5);
        $this->assertEquals(false, $result5);
        $this->assertEquals(TranscriptionReader::ERROR_NO_EDITOR, 
                $tsReader->errorNumber);
        
        $xml6 = file_get_contents("test-transcriptions/testNotValid06.xml");
        $tsReader->reset();
        $result6 =  $tsReader->read($xml6);
        $this->assertEquals(false, $result6);
        $this->assertEquals(TranscriptionReader::ERROR_XML_LANG_NOT_FOUND, 
                $tsReader->errorNumber);
    }

    public function testFileWithNoRealData(){
        $tsReader = new TranscriptionReader();

        $xml = file_get_contents('test-transcriptions/testNoRealData01.xml');
        $result = $tsReader->read($xml);
        $this->assertEquals(true, $result);
        $this->assertEquals('', $tsReader->errorMsg);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertCount(1, $tsReader->transcription['people']);
        $this->assertEquals('someusername', 
                $tsReader->transcription['people'][0]);
        $this->assertEquals(0, 
                $tsReader->transcription['countBodyDivsProcessed']);
        
        $tsReader->reset();
        $xml2 = file_get_contents('test-transcriptions/testNoRealData02.xml');
        $result2 = $tsReader->read($xml2);
        $this->assertEquals(true, $result2);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertCount(1, $tsReader->transcription['people']);
        $this->assertEquals('someusername', 
                $tsReader->transcription['people'][0]);
        $this->assertEquals(5, 
                $tsReader->transcription['countBodyDivsProcessed']);
        
        $tsReader->reset();
        $xml3 = file_get_contents('test-transcriptions/testNoRealData03.xml');
        $result3 = $tsReader->read($xml3);
        $this->assertEquals(true, $result3);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertCount(1, $tsReader->transcription['people']);
        $this->assertEquals('someusername',
                $tsReader->transcription['people'][0]);
        $this->assertEquals(5,
                $tsReader->transcription['countBodyDivsProcessed']);
        $this->assertCount(1, $tsReader->transcription['pageDivs']);
        $pageDiv = $tsReader->transcription['pageDivs'][0];
        $this->assertEquals('someid', $pageDiv['facs']);
        $this->assertEquals('', $pageDiv['defaultLang']);
        $this->assertCount(1, $pageDiv['cols']);
        $col = $pageDiv['cols'][1];
        $this->assertEquals('', $col['defaultLang']);
        
        $tsReader->reset();
        $xml4 = file_get_contents('test-transcriptions/testNoRealData04.xml');
        $result4 = $tsReader->read($xml4);
        $this->assertEquals(true, $result4);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertCount(1, $tsReader->transcription['people']);
        $this->assertEquals('someusername',
                $tsReader->transcription['people'][0]);
        $this->assertEquals(6,
                $tsReader->transcription['countBodyDivsProcessed']);
        $this->assertCount(2, $tsReader->transcription['pageDivs']);
        $pageDiv1 =  $tsReader->transcription['pageDivs'][0];
        $this->assertEquals('someid', $pageDiv1['facs']);
        $this->assertEquals('', $pageDiv1['defaultLang']);
        $this->assertCount(1, $pageDiv1['cols']);
        $col2 = $pageDiv1['cols'][1];
        $this->assertEquals('', $col2['defaultLang']);
        
        $pageDiv2 = $tsReader->transcription['pageDivs'][1];
        $this->assertEquals('someotherid', $pageDiv2['facs']);
        $this->assertCount(1, $pageDiv2['cols']);
        $this->assertEquals(1, $pageDiv2['nGaps']);
        $this->assertFalse(isset($pageDiv2['cols'][1]));
        $this->assertTrue(isset($pageDiv2['cols'][2]));
        $col3 = $pageDiv2['cols'][2];
        $this->assertEquals('', $col3['defaultLang']);
    }
    
    function testElements()
    {
        $tsReader = new TranscriptionReader();

        $xml = file_get_contents('test-transcriptions/testSimpleLines.xml');
        $result = $tsReader->read($xml);
        $this->assertEquals(true, $result);
        $this->assertEquals('', $tsReader->errorMsg);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertCount(1, $tsReader->transcription['people']);
        $this->assertCount(1, $tsReader->transcription['pageDivs']);
        $pageDiv =  $tsReader->transcription['pageDivs'][0];
        $this->assertCount(1, $pageDiv['cols']);
        $this->assertFalse(isset($pageDiv['cols'][0]));
        $this->assertTrue(isset($pageDiv['cols'][1]));
        $this->assertCount(9, $pageDiv['cols'][1]['elements']);
        $this->assertCount(2, $tsReader->warnings);
        foreach ($tsReader->warnings as $w){
            $this->assertEquals(TranscriptionReader::WARNING_IGNORED_ELEMENT, $w['number']);
        }
        $element1 = $pageDiv['cols'][1]['elements'][0];
        $this->assertEquals(ColumnElement\Element::LINE, $element1->type);
        $this->assertEquals(1, $element1->seq);
        $this->assertEquals(1, $element1->columnNumber);
        $this->assertEquals('', $element1->lang);
        $this->assertEquals(1, $element1->getLineNumber());
        $item_1_1 = $element1->items->getItem(1);
        $this->assertTrue($item_1_1 instanceof TxText\Text);
        $this->assertEquals('Latine', $item_1_1->theText);
        
        $element2 = $pageDiv['cols'][1]['elements'][1];
        $this->assertEquals(ColumnElement\Element::LINE, $element2->type);
        $this->assertEquals(2, $element2->seq);
        $this->assertEquals(1, $element2->columnNumber);
        $this->assertEquals('ar', $element2->lang);
        $this->assertEquals(2, $element2->getLineNumber());
        
        $element3 = $pageDiv['cols'][1]['elements'][2];
        $this->assertEquals(ColumnElement\Element::HEAD, $element3->type);
        $this->assertEquals(3, $element3->seq);
        $this->assertEquals(1, $element3->columnNumber);
        $this->assertEquals('', $element3->lang);
        
        $element4 = $pageDiv['cols'][1]['elements'][3];
        $this->assertEquals(ColumnElement\Element::CUSTODES, $element4->type);
        $this->assertEquals(4, $element4->seq);
        $this->assertEquals(1, $element4->columnNumber);
        $this->assertEquals('', $element4->lang);
        
        $element5 = $pageDiv['cols'][1]['elements'][4];
        $this->assertEquals(ColumnElement\Element::LINE, $element5->type);
        $this->assertEquals(5, $element5->seq);
        $this->assertEquals(1, $element5->columnNumber);
        $this->assertEquals('', $element5->lang);
        $this->assertEquals(3, $element5->getLineNumber());
        $item_5_1 = $element5->items->getItem(1);
        $this->assertTrue($item_5_1 instanceof TxText\Text);
        $this->assertEquals('Another line with ', $item_5_1->theText);
        $item_5_2 = $element5->items->getItem(2);
        $this->assertTrue($item_5_2 instanceof TxText\Sic);
        $this->assertEquals('Some text', $item_5_2->theText);
        
        $element6 = $pageDiv['cols'][1]['elements'][5];
        $this->assertEquals(ColumnElement\Element::GLOSS, $element6->type);
        $this->assertEquals(6, $element6->seq);
        $this->assertEquals(1, $element6->columnNumber);
        $this->assertEquals('', $element6->lang);
        $item_6_1 = $element6->items->getItem(1);
        $this->assertTrue($item_6_1 instanceof TxText\Text);
        $this->assertEquals('A gloss', $item_6_1->theText);
        
        // The 7th element is the line after the gap, line number should be 6
        $element7 = $pageDiv['cols'][1]['elements'][6];
        $this->assertEquals(ColumnElement\Element::LINE, $element7->type);
        $this->assertEquals(7, $element7->seq);
        $this->assertEquals(1, $element7->columnNumber);
        $this->assertEquals('', $element7->lang);
        $this->assertEquals(6, $element7->getLineNumber());
        $item_7_1 = $element7->items->getItem(1);
        $this->assertTrue($item_7_1 instanceof TxText\Text);
        $this->assertEquals('Yet another line', $item_7_1->theText);
        
        $element8 = $pageDiv['cols'][1]['elements'][7];
        $this->assertEquals(ColumnElement\Element::PAGE_NUMBER, $element8->type);
        $this->assertEquals(8, $element8->seq);
        $this->assertEquals(1, $element8->columnNumber);
        $this->assertEquals('', $element8->lang);
        $item_8_1 = $element8->items->getItem(1);
        $this->assertTrue($item_8_1 instanceof TxText\Text);
        $this->assertEquals('175v', $item_8_1->theText);
        
        $element9 = $pageDiv['cols'][1]['elements'][8];
        $this->assertEquals(ColumnElement\Element::ADDITION, $element9->type);
        $this->assertEquals(9, $element9->seq);
        $this->assertEquals(1, $element9->columnNumber);
        $this->assertEquals('', $element9->lang);
        $this->assertEquals('page-XXX-add-YYY', $element9->targetXmlId);
        $this->assertEquals('margin left', $element9->placement);
        
        $id = 0;
        foreach ($pageDiv['cols'][1]['elements'] as $element) {
            $seq = 1;
            foreach ($element->items->theItems as $item) {
                $this->assertEquals($id, $item->id);
                $this->assertEquals($seq, $item->seq);
                $id++;
                $seq++;
            }
        }
    }
    
    public function testNotes()
    {
        $tsReader = new TranscriptionReader();

        $xml = file_get_contents('test-transcriptions/testNotes.xml');
        $result = $tsReader->read($xml);
        // Basic integrity check!
        $this->assertEquals(true, $result);
        $this->assertEquals('', $tsReader->errorMsg);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertCount(1, $tsReader->transcription['people']);
        $this->assertCount(1, $tsReader->transcription['pageDivs']);
        $pageDiv = $tsReader->transcription['pageDivs'][0];
        $this->assertCount(1, $pageDiv['cols']);
        
        // Now on to the column
        $col = $pageDiv['cols'][1];
        $this->assertCount(3, $col['elements']);
        $this->assertCount(4, $col['ednotes']);
        foreach($col['ednotes'] as $ednote){
            $this->assertTrue($ednote instanceof EditorialNote);
        }
        
        // First element: line with 1 sic item, 1 ednote
        $element1 = $col['elements'][0];
        $this->assertTrue($element1 instanceof ColumnElement\Line);
        $this->assertCount(1, $element1->items->theItems);
        $this->assertTrue($element1->items->getItem(1) instanceof TxText\Sic);
        $this->assertEquals('Sic with note ', $element1->items->getItem(1)->getText());
        
        $itemId1 = $element1->items->getItem(1)->id;
        $note1 = $col['ednotes'][0];
        $this->assertEquals(EditorialNote::INLINE, $note1->type);
        $this->assertEquals($itemId1, $note1->target);
        $this->assertEquals('Note text', $note1->text);
        
        // Second element, line with 1 item, 2 ednotes
        $element2 = $col['elements'][1];
        $this->assertTrue($element2 instanceof ColumnElement\Line);
        $this->assertCount(1, $element2->items->theItems);
        $this->assertTrue($element2->items->getItem(1) instanceof TxText\Sic);
        $this->assertEquals('Sic with two notes ', $element2->items->getItem(1)->getText());
        $itemId2 = $element2->items->getItem(1)->id;
        $note2 = $col['ednotes'][1];
        $this->assertEquals(EditorialNote::INLINE, $note2->type);
        $this->assertEquals($itemId2, $note2->target);
        $this->assertEquals('Note 1', $note2->text);
        $note3 = $col['ednotes'][2];
        $this->assertEquals(EditorialNote::INLINE, $note3->type);
        $this->assertEquals($itemId2, $note3->target);
        $this->assertEquals('Note 2', $note3->text);
        
        // Third element, a note mark
        $element3 = $col['elements'][2];
        $this->assertTrue($element3 instanceof ColumnElement\NoteMark);
        $this->assertCount(0, $element3->items->theItems);
        $element3Id = $element3->id;
        $note4 = $col['ednotes'][3];
        $this->assertEquals(EditorialNote::OFFLINE, $note4->type);
        $this->assertEquals($element3Id, $note4->target);
        $this->assertEquals('An offline note', $note4->text);
    }
    
    function testItems(){
        $tsReader = new TranscriptionReader();

        $xml = file_get_contents('test-transcriptions/testItems.xml');
        $result = $tsReader->read($xml);
        // Basic integrity check!
        $this->assertEquals(true, $result);
        $this->assertEquals('', $tsReader->errorMsg);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertCount(1, $tsReader->transcription['people']);
        $this->assertCount(1, $tsReader->transcription['pageDivs']);
        $pageDiv = $tsReader->transcription['pageDivs'][0];
        $this->assertCount(1, $pageDiv['cols']);
        $this->assertCount(1, $pageDiv['cols'][1]['elements']);
        $lineElement = $pageDiv['cols'][1]['elements'][0];
        $this->assertTrue($lineElement instanceof ColumnElement\Line);
        
        // Number of Items
        $this->assertEquals(5, $lineElement->items->nItems());
        
        $item1 = $lineElement->items->getItem(1);
        $this->assertTrue($item1 instanceof TxText\Text);
        
        $item2 = $lineElement->items->getItem(2);
        $this->assertTrue($item2 instanceof TxText\Sic);
        
        $item3 = $lineElement->items->getItem(3);
        $this->assertTrue($item3 instanceof TxText\Initial);
        
        $item4 = $lineElement->items->getItem(4);
        $this->assertTrue($item4 instanceof TxText\Rubric);
        
        $item5 = $lineElement->items->getItem(5);
        $this->assertTrue($item5 instanceof TxText\Unclear);
        
        
    }
}
