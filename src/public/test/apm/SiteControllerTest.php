<?php

/*
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
require 'SiteMockup/testconfig.php';
require 'SiteMockup/SiteTestEnvironment.php';


use PHPUnit\Framework\TestCase;
use GuzzleHttp\Psr7\ServerRequest;

use APM\Site\SiteCollationTable;

use AverroesProject\TxText\ItemArray;
use AverroesProject\TxText\Text;
use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\Rubric;
use AverroesProject\TxText\Sic;
use AverroesProject\TxText\Unclear;
use AverroesProject\TxText\Deletion;
use AverroesProject\TxText\MarginalMark;
use AverroesProject\TxText\Addition;
use AverroesProject\TxText\NoWordBreak;
use AverroesProject\TxText\Mark;

use AverroesProject\ColumnElement\Line;

use AverroesProject\EditorialNote;


/**
 * Description of TestAuthenticator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SiteControllerTest extends TestCase {
    static $ci;
    static $dm;
    
    static $testEnvironment;
    
    static $editor1;
    static $editor2;
    
    
    public static function setUpBeforeClass()
    { 
        global $apmTestConfig;
        
        
        self::$testEnvironment = new SiteTestEnvironment($apmTestConfig);
        self::$ci = self::$testEnvironment->getContainer();
        self::$dm = self::$ci->db;
        self::$testEnvironment->emptyDatabase();
        
        self::$editor1 = self::$dm->um->createUserByUserName('testeditor1');
        self::$editor2 = self::$dm->um->createUserByUserName('testeditor2');
        
    }
    
    public function testQuickCollationPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        
        $sc = new SiteCollationTable(self::$ci);
        
        $response = $sc->quickCollationPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    
    public function testChunkAndWitnessPage()
    {
        $work = 'AW47';
        $chunkNo = 1;
        
        $numPages = 5;
        /* @var $dm \AverroesProject\Data\DataManager */
        $dm = self::$dm;
        $docId = $dm->newDoc('Test site Doc', 'TA-1', $numPages, 'la', 
                'mss', 'local', 'TESTSITE1');
        
        $docId2 = $dm->newDoc('Test site Doc 2', 'TA-2', $numPages, 'la', 
                'mss', 'local', 'TESTSITE2');
        
        $docId3 = $dm->newDoc('Test site Doc 3', 'TA-3', $numPages, 'la', 
                'mss', 'local', 'TESTSITE3');
        
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
            $dm->addNewColumn($docId2, $i);
            $dm->addNewColumn($docId3, $i);
        }
        $editor = $dm->um->createUserByUsername('anothereditor');
        $this->assertNotFalse($editor);
        $dm->um->allowUserTo(self::$editor1, 'witness-view-details');
        
        // A valid witness in doc 1
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        $element = new Line();
        $element->pageId = $pageId;
        $element->columnNumber = 1;
        $element->editorId = $editor;
        $element->lang = 'la';
        $element->handId = 0;
        $element->seq = 0;
        $itemSeq=0;
        $itemId = 0;
        ItemArray::addItem($element->items, new ChunkMark($itemId++, $itemSeq++, $work, $chunkNo, 'start', 1));  
        // Some items to try to hit all formatting cases too!
        ItemArray::addItem($element->items, new Text($itemId++,$itemSeq++,"The text of the chunk: "));  
        ItemArray::addItem($element->items, new Rubric($itemId++,$itemSeq++,"a rubric"));  
        ItemArray::addItem($element->items, new Sic($itemId++,$itemSeq++,"sic", "correction")); 
        ItemArray::addItem($element->items, new Sic($itemId++,$itemSeq++,"sic2")); 
        ItemArray::addItem($element->items, new Unclear($itemId++,$itemSeq++,"unclear", "first reading")); 
        ItemArray::addItem($element->items, new Deletion($itemId++,$itemSeq++,"a deletion", 'strikeout'));  
        ItemArray::addItem($element->items, new MarginalMark($itemId++,$itemSeq++,'[REF]'));  
        ItemArray::addItem($element->items, new Addition($itemId++,$itemSeq++,"an addition", 'margin right')); 
        ItemArray::addItem($element->items, new Text($itemId++,$itemSeq++,"a word that cont"));  
        ItemArray::addItem($element->items, new NoWordBreak($itemId++,$itemSeq++));  
        ItemArray::addItem($element->items, new Text($itemId++,$itemSeq++,"\ntinues in the next line"));  
        $noteItemId = $itemId;
        ItemArray::addItem($element->items, new Mark($itemId++,$itemSeq++));  
        ItemArray::addItem($element->items, new ChunkMark($itemId++, $itemSeq++, $work, $chunkNo, 'end', 1));  
        $dm->insertNewElement($element)->id;
        
        $dm->enm->insertNote(EditorialNote::INLINE, $noteItemId, self::$editor2, 'this is a note');
        
        
        // An invalid witness in doc 2
        $pageId2 =  $dm->getPageIdByDocPage($docId2, 1);
        $element2 = new Line();
        $element2->pageId = $pageId2;
        $element2->columnNumber = 1;
        $element2->editorId = $editor;
        $element2->lang = 'la';
        $element2->handId = 0;
        $element2->seq = 0;
        $itemSeq=0;
        ItemArray::addItem($element2->items, new ChunkMark($itemId++,$itemSeq++, $work, $chunkNo, 'start', 1));  
        ItemArray::addItem($element2->items, new Text($itemId++,$itemSeq++,"The text of the chunk"));  
        $dm->insertNewElement($element2)->id;
        
        // No witness at all in doc 3
        $pageId3 =  $dm->getPageIdByDocPage($docId3, 1);
        $element3 = new Line();
        $element3->pageId = $pageId3;
        $element3->columnNumber = 1;
        $element3->editorId = $editor;
        $element3->lang = 'la';
        $element3->handId = 0;
        $element3->seq = 0;
        $itemSeq=0;
        ItemArray::addItem($element3->items, new Text($itemId++,$itemSeq++,"Text outside of the chunk"));  
        $dm->insertNewElement($element3)->id;

        // Witness Page Test
        // 1. With a good witness
        $request = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo)
                ->withAttribute('type', 'doc')
                ->withAttribute('id', $docId);
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => self::$editor1];
        $chunkPageObject = new Site\ChunkPage(self::$ci);
        $response = $chunkPageObject->witnessPage($request, $inputResp, 
                NULL);
        $this->assertEquals(200, $response->getStatusCode());
        
        // 2. with a bad witness
        $request2 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo)
                ->withAttribute('type', 'doc')
                ->withAttribute('id', $docId2);
        $inputResp2 = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => self::$editor1];
        $chunkPageObject2 = new Site\ChunkPage(self::$ci);
        $response2 = $chunkPageObject2->witnessPage($request2, $inputResp2, 
                NULL);
        $this->assertEquals(200, $response2->getStatusCode());
        
        // 3. with a doc without any chunk text
        $request3 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo)
                ->withAttribute('type', 'doc')
                ->withAttribute('id', $docId3);
        $inputResp3 = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => self::$editor1];
        $chunkPageObject3 = new Site\ChunkPage(self::$ci);
        $response3 = $chunkPageObject3->witnessPage($request3, $inputResp3, 
                NULL);
        $this->assertEquals(200, $response3->getStatusCode());
        
        // Chunk page test
        $request1_1 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo);
        $inputResp1_1 = new \Slim\Http\Response();
        
        
        $chunkPageObject4 = new Site\ChunkPage(self::$ci);
        
        
        $response1_1 = $chunkPageObject4->singleChunkPage($request1_1, $inputResp1_1, 
                NULL);
        
        $this->assertEquals(200, $response1_1->getStatusCode());
        
    }
    
}
