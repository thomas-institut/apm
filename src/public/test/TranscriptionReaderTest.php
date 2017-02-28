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
use \XMLReader;

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
        $this->assertCount(5, $pageDiv['elements']);
        $this->assertCount(2, $tsReader->warnings);
        foreach ($tsReader->warnings as $w){
            $this->assertEquals(TranscriptionReader::WARNING_IGNORED_ELEMENT, $w['number']);
        }
        $firstElement = $pageDiv['elements'][0];
        $this->assertEquals(ColumnElement\Element::LINE, $firstElement->type);
        $this->assertEquals(1, $firstElement->seq);
        $this->assertEquals(1, $firstElement->columnNumber);
        $this->assertEquals('', $firstElement->lang);
        $this->assertEquals(1, $firstElement->getLineNumber());
        $secondElement = $pageDiv['elements'][1];
        $this->assertEquals(ColumnElement\Element::LINE, $secondElement->type);
        $this->assertEquals(2, $secondElement->seq);
        $this->assertEquals(1, $secondElement->columnNumber);
        $this->assertEquals('ar', $secondElement->lang);
        $this->assertEquals(2, $secondElement->getLineNumber());
        $thirdElement = $pageDiv['elements'][2];
        $this->assertEquals(ColumnElement\Element::HEAD, $thirdElement->type);
        $this->assertEquals(3, $thirdElement->seq);
        $this->assertEquals(1, $thirdElement->columnNumber);
        $this->assertEquals('', $thirdElement->lang);
        $fourthElement = $pageDiv['elements'][3];
        $this->assertEquals(ColumnElement\Element::CUSTODES, $fourthElement->type);
        $this->assertEquals(4, $fourthElement->seq);
        $this->assertEquals(1, $fourthElement->columnNumber);
        $this->assertEquals('', $fourthElement->lang);
        $fifthElement = $pageDiv['elements'][4];
        $this->assertEquals(ColumnElement\Element::LINE, $fifthElement->type);
        $this->assertEquals(5, $fifthElement->seq);
        $this->assertEquals(1, $fifthElement->columnNumber);
        $this->assertEquals('', $fifthElement->lang);
        $this->assertEquals(3, $fifthElement->getLineNumber());
    }
    
}
