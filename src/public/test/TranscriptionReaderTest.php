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
    
    public function testFastForward()
    {
        $tsReader = new TranscriptionReader();
        
        $xmlReader = new XMLReader();
        
        $xmlReader->XML("<!-- Some comment--><test><sometag/>\n<thetag>Text</thetag><!-- More comments-->   <other>text</other><thetag>Text</thetag></test>");
        
        $result = $tsReader->fastForwardToElement($xmlReader, 'thetag');
        $this->assertEquals(true, $result);
        $this->assertEquals(TranscriptionReader::ERROR_NO_ERROR, $tsReader->errorNumber);
        
        $result = $tsReader->fastForwardToElement($xmlReader, 'thetag');
        $this->assertEquals(true, $result);
        $this->assertEquals(TranscriptionReader::ERROR_NO_ERROR, $tsReader->errorNumber);
        
        
        $result = $tsReader->fastForwardToElement($xmlReader, 'thetag');
        $this->assertEquals(false, $result);
        $this->assertEquals(TranscriptionReader::ERROR_EOF, $tsReader->errorNumber);
        
        $xmlReader->XML("<test><sometag/><thetag>Text</thetag><other>text</other><thetag>Text</thetag></test>");
        $result = $tsReader->fastForwardToElement($xmlReader, 'notthetag');
        $this->assertEquals(false, $result);
        $this->assertEquals(TranscriptionReader::ERROR_EOF, $tsReader->errorNumber);
        
    }
    
    
    public function testGetInfoFromHeader(){
        $tsReader = new TranscriptionReader();
        $xmlReader = new XMLReader();
        
        $xmlReader->open("test-transcriptions/testHeader01.xml");
        
        $result = $tsReader->getInfoFromHeader($xmlReader);
        $this->assertEquals(true, $result);
        $this->assertEquals(TranscriptionReader::ERROR_NO_ERROR, $tsReader->errorNumber);
        $this->assertEquals(1, count($tsReader->transcription['editors']));
        $this->assertEquals('someusername', $tsReader->transcription['editors'][0]);
        
        $xmlReader->open("test-transcriptions/testHeader02.xml");
        $tsReader->reset();
        $result = $tsReader->getInfoFromHeader($xmlReader);
        $this->assertEquals(true, $result);
        $this->assertEquals(TranscriptionReader::ERROR_NO_ERROR, $tsReader->errorNumber);
        $this->assertEquals(1, count($tsReader->transcription['editors']));
        $this->assertEquals('someusername', $tsReader->transcription['editors'][0]);
        
        $xmlReader->open("test-transcriptions/testHeader03.xml");
        $tsReader->reset();
        $result = $tsReader->getInfoFromHeader($xmlReader);
        $this->assertEquals(false, $result);
        $this->assertEquals(TranscriptionReader::ERROR_NOT_TEI, $tsReader->errorNumber);
        $this->assertEquals(TranscriptionReader::MSG_LOOKING_FOR_TEI, $tsReader->errorContext);

        $xmlReader->open("test-transcriptions/testHeader04.xml");
        $tsReader->reset();
        $result = $tsReader->getInfoFromHeader($xmlReader);
        $this->assertEquals(false, $result);
        $this->assertEquals(TranscriptionReader::ERROR_EOF, $tsReader->errorNumber);
        $this->assertEquals(TranscriptionReader::MSG_LOOKING_FOR_TEI_HEADER, $tsReader->errorContext);
        
        $xmlReader->open("test-transcriptions/testHeader04.xml");
        $tsReader->reset();
        $result = $tsReader->getInfoFromHeader($xmlReader);
        $this->assertEquals(false, $result);
        $this->assertEquals(TranscriptionReader::ERROR_EOF, $tsReader->errorNumber);
        $this->assertEquals(TranscriptionReader::MSG_LOOKING_FOR_TEI_HEADER, $tsReader->errorContext);
        
        $xmlReader->open("test-transcriptions/testHeader05.xml");
        $tsReader->reset();
        $result = $tsReader->getInfoFromHeader($xmlReader);
        $this->assertEquals(false, $result);
        $this->assertEquals(TranscriptionReader::ERROR_INCORRECT_STRUCTURE, $tsReader->errorNumber);
        
        $xmlReader->open("test-transcriptions/testHeader06.xml");
        $tsReader->reset();
        $result = $tsReader->getInfoFromHeader($xmlReader);
        $this->assertEquals(false, $result);
        $this->assertEquals(TranscriptionReader::ERROR_NOT_TEI, $tsReader->errorNumber);
    }
    
    public function testGetDefaultLang(){
        $tsReader = new TranscriptionReader();
        $xmlReader = new XMLReader();
        
        $xmlReader->open("test-transcriptions/testGetLang01.xml");
        $tsReader->getInfoFromHeader($xmlReader); //should be succesful!
        $result = $tsReader->getDefaultLanguageFromTextElement($xmlReader);
        $this->assertEquals(true, $result);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        
        $tsReader->reset();
        $xmlReader->open("test-transcriptions/testGetLang02.xml");
        $tsReader->getInfoFromHeader($xmlReader); //should be succesful!
        $result = $tsReader->getDefaultLanguageFromTextElement($xmlReader);
        $this->assertEquals(true, $result);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        
        $tsReader->reset();
        $xmlReader->open("test-transcriptions/testGetLang03.xml");
        $tsReader->getInfoFromHeader($xmlReader); //should be succesful!
        $result = $tsReader->getDefaultLanguageFromTextElement($xmlReader);
        $this->assertEquals(false, $result);
        $this->assertEquals('', $tsReader->transcription['defaultLang']);
        $this->assertEquals(TranscriptionReader::ERROR_XML_LANG_NOT_FOUND, $tsReader->errorNumber);
    }
    
    public function testFileWithNoRealData(){
        $tsReader = new TranscriptionReader();
        $xmlReader = new XMLReader();
        
        $xmlReader->open("test-transcriptions/testNoRealData01.xml");
        $result = $tsReader->read($xmlReader);
        $this->assertEquals(true, $result);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertEquals(1, count($tsReader->transcription['editors']));
        $this->assertEquals('someusername', $tsReader->transcription['editors'][0]);
        $this->assertEquals(0, $tsReader->transcription['countBodyDivsProcessed']);
        
        $tsReader->reset();
        $xmlReader->open("test-transcriptions/testNoRealData02.xml");
        $result = $tsReader->read($xmlReader);
        $this->assertEquals(true, $result);
        $this->assertEquals('la', $tsReader->transcription['defaultLang']);
        $this->assertEquals(1, count($tsReader->transcription['editors']));
        $this->assertEquals('someusername', $tsReader->transcription['editors'][0]);
        $this->assertEquals(5, $tsReader->transcription['countBodyDivsProcessed']);
    }
    
}
