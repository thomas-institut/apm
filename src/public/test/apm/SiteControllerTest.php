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
require "../vendor/autoload.php";
require 'SiteMockup/testconfig.php';
require 'SiteMockup/SiteTestEnvironment.php';


use PHPUnit\Framework\TestCase;


use GuzzleHttp\Psr7\ServerRequest;
use GuzzleHttp\Psr7;
use Slim\Http\Response;

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
    
    public static function setUpBeforeClass()
    { 
        global $apmTestConfig;
        
        
        self::$testEnvironment = new SiteTestEnvironment($apmTestConfig);
        self::$ci = self::$testEnvironment->getContainer();
        self::$dm = self::$ci->db;
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
    
     public function testHomePage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        
        $sc = new \AverroesProject\Site\SiteHomePage(self::$ci);
        $response = $sc->homePage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(302, $response->getStatusCode());
    }
    
        public function testDashboardPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100, 'username' => 'testUser'];
         
        $sc = new \AverroesProject\Site\SiteDashboard(self::$ci);
        
        $response =$sc->dashboardPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
        public function testDocumentsPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        
        $sc = new \AverroesProject\Site\SiteDocuments(self::$ci);
        
        $response = $sc->documentsPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    public function testChunksPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        $sc = new \AverroesProject\Site\SiteChunks(self::$ci);
        
        $response = $sc->chunksPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    public function testUserManagerPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        
        $sc = new \AverroesProject\Site\SiteUserManager(self::$ci);
        
        $response =$sc->userManagerPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    
    public function testChunkAndWitnessPage()
    {
        self::$testEnvironment->emptyDatabase();
        $editor1 = self::$dm->um->createUserByUserName('testeditor1');
        $editor2 = self::$dm->um->createUserByUserName('testeditor2');
        $editor3 = self::$dm->um->createUserByUsername('anothereditor');
        
        $this->assertNotFalse($editor1);
        $this->assertNotFalse($editor2);
        $this->assertNotFalse($editor3);
        self::$ci['userInfo'] = ['id' => $editor1];
        /* @var $dm \AverroesProject\Data\DataManager */
        $dm = self::$dm;
        $dm->userManager->allowUserTo($editor1, 'witness-view-details');
        
        $work = 'AW47';
        $chunkNo = 1;
        $lang1 = 'la';
        $lang2 = 'he';
        $numPages = 5;

        $docId = $dm->newDoc('Test site Doc', 'TA-1', $numPages, $lang1, 
                'mss', 'local', 'TESTSITE1');
        $docId2 = $dm->newDoc('Test site Doc 2', 'TA-2', $numPages, $lang1, 
                'mss', 'local', 'TESTSITE2');
        $docId3 = $dm->newDoc('Test site Doc 3', 'TA-3', $numPages, $lang1, 
                'mss', 'local', 'TESTSITE3');
        $docId4 = $dm->newDoc('Test site Doc 4', 'TA-4', $numPages, $lang1, 
                'mss', 'local', 'TESTSITE4');
        // in a different language!
        $docId5 = $dm->newDoc('Test site Doc 5', 'TA-5', $numPages, $lang2, 
                'mss', 'local', 'TESTSITE5');
        
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
            $dm->addNewColumn($docId2, $i);
            $dm->addNewColumn($docId3, $i);
            $dm->addNewColumn($docId4, $i);
            $dm->addNewColumn($docId5, $i);
        }
        
        // A valid witness in doc 1
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        $element = new Line();
        $element->pageId = $pageId;
        $element->columnNumber = 1;
        $element->editorId = $editor3;
        $element->lang = $lang1;
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
        $dm->insertNewElement($element);
        
        $dm->edNoteManager->insertNote(EditorialNote::INLINE, $noteItemId, $editor2, 'this is a note');
        
        
        // An invalid witness in doc 2
        $pageId2 =  $dm->getPageIdByDocPage($docId2, 1);
        $element2 = new Line();
        $element2->pageId = $pageId2;
        $element2->columnNumber = 1;
        $element2->editorId = $editor3;
        $element2->lang = $lang1;
        $element2->handId = 0;
        $element2->seq = 0;
        $itemSeq2=0;
        ItemArray::addItem($element2->items, new ChunkMark($itemId++,$itemSeq2++, $work, $chunkNo, 'start', 1));  
        ItemArray::addItem($element2->items, new Text($itemId++,$itemSeq2++,"The text of the chunk"));  
        $dm->insertNewElement($element2);
        
        // No witness at all in doc 3
        $pageId3 =  $dm->getPageIdByDocPage($docId3, 1);
        $element3 = new Line();
        $element3->pageId = $pageId3;
        $element3->columnNumber = 1;
        $element3->editorId = $editor3;
        $element3->lang = $lang1;
        $element3->handId = 0;
        $element3->seq = 0;
        $itemSeq3=0;
        ItemArray::addItem($element3->items, new Text($itemId++,$itemSeq3++,"Text outside of the chunk"));  
        $dm->insertNewElement($element3);

        // Witness Page Test
        // 1. With a good witness
        $request = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo)
                ->withAttribute('type', 'doc')
                ->withAttribute('id', $docId);
        $inputResp = new \Slim\Http\Response();
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
        $chunkPageObject3 = new Site\ChunkPage(self::$ci);
        $response3 = $chunkPageObject3->witnessPage($request3, $inputResp3, 
                NULL);
        $this->assertEquals(200, $response3->getStatusCode());
        
        // Chunk page test
        
        // with 3 good witnesses
        $pageId4 =  $dm->getPageIdByDocPage($docId4, 1);
        $element4 = new Line();
        $element4->pageId = $pageId4;
        $element4->columnNumber = 1;
        $element4->editorId = $editor3;
        $element4->lang = $lang1;
        $element4->handId = 0;
        $element4->seq = 0;
        $itemSeq4=0;
        $itemId4 = 0;
        ItemArray::addItem($element4->items, new ChunkMark($itemId4++, $itemSeq4++, $work, $chunkNo, 'start', 1));  
        // Some items to try to hit all formatting cases too!
        ItemArray::addItem($element4->items, new Text($itemId4++,$itemSeq4++,"The text of the chunk: "));  
        ItemArray::addItem($element4->items, new Rubric($itemId4++,$itemSeq4++,"a rubric"));  
        ItemArray::addItem($element4->items, new ChunkMark($itemId4++, $itemSeq4++, $work, $chunkNo, 'end', 1));  
        $dm->insertNewElement($element4);
        
        $pageId5 =  $dm->getPageIdByDocPage($docId5, 1);
        $element5 = new Line();
        $element5->pageId = $pageId5;
        $element5->columnNumber = 1;
        $element5->editorId = $editor3;
        $element5->lang = $lang2;
        $element5->handId = 0;
        $element5->seq = 0;
        $itemSeq5=0;
        $itemId5 = 0;
        ItemArray::addItem($element5->items, new ChunkMark($itemId5++, $itemSeq5++, $work, $chunkNo, 'start', 1));  
        // Some items to try to hit all formatting cases too!
        ItemArray::addItem($element5->items, new Text($itemId5++,$itemSeq5++,"The text of the chunk: "));  
        ItemArray::addItem($element5->items, new Rubric($itemId5++,$itemSeq5++,"a rubric"));  
        ItemArray::addItem($element5->items, new ChunkMark($itemId5++, $itemSeq5++, $work, $chunkNo, 'end', 1));  
        $dm->insertNewElement($element5);
        
        $request1_1 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo);
        $inputResp1_1 = new \Slim\Http\Response();
        
        
        $chunkPageObject4 = new Site\ChunkPage(self::$ci);
        
        $response1_1 = $chunkPageObject4->singleChunkPage($request1_1, $inputResp1_1, 
                NULL);
        
        $this->assertEquals(200, $response1_1->getStatusCode());
        
        // Good witness pages
        $request4 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo)
                ->withAttribute('type', 'doc')
                ->withAttribute('id', $docId5);
        $inputResp4 = new \Slim\Http\Response();
        $chunkPageObject4 = new Site\ChunkPage(self::$ci);
        $response4 = $chunkPageObject4->witnessPage($request4, $inputResp4, 
                NULL);
        $this->assertEquals(200, $response4->getStatusCode());
        
        $request4_2 = $request4->withAttribute('output', 'html');
        $response4_2 = $chunkPageObject4->witnessPage($request4_2, $inputResp4, 
                NULL);
        $this->assertEquals(200, $response4_2->getStatusCode());
        
        $request4_3 = $request4->withAttribute('output', 'text');
        $response4_3 = $chunkPageObject4->witnessPage($request4_3, $inputResp4, 
                NULL);
        $this->assertEquals(200, $response4_3->getStatusCode());
        
        $request4_4 = $request4->withAttribute('output', 'badoutput');
        $response4_4 = $chunkPageObject4->witnessPage($request4_4, $inputResp4, 
                NULL);
        $this->assertEquals(402, $response4_4->getStatusCode());
        
        return [ 'work' => $work, 'chunk' => $chunkNo, 'lang' => $lang1, 'editors' => [ $editor1, $editor2, $editor3]];
        
    }
    
    /**
     * @depends testChunkAndWitnessPage
     */
    public function testAutomaticCollationTableGet(array $witnessInfo) {
        
        $work = $witnessInfo['work'];
        $chunkNo = $witnessInfo['chunk'];
        $lang = $witnessInfo['lang'];
        $editor1 = $witnessInfo['editors'][0];

        self::$ci['userInfo'] = ['id' => $editor1];
        self::$dm->um->allowUserTo($editor1, 'act-view-experimental-data');
        
        $collationTableControllerObject = new SiteCollationTable(self::$ci);
        
        // Bad language
        $request1 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo) 
                ->withAttribute('lang', 'bad'  . $lang);
        $inputResp1 = new \Slim\Http\Response();
        
        $response1 = $collationTableControllerObject->automaticCollationPageGet($request1, $inputResp1, 
                NULL);
        $this->assertEquals(200, $response1->getStatusCode());
        
        
        $request2 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo) 
                ->withAttribute('lang', $lang);
        $inputResp2 = new \Slim\Http\Response();
        
        
        // a partial collation (with bad doc ids)
        $docList = '45/24/34/35';
        
        $response2 = $collationTableControllerObject->automaticCollationPageGet($request2, $inputResp2, 
                [ 'docs' => $docList, 'ignore_punct' => 'whatever']);
        $this->assertEquals(200, $response2->getStatusCode());
        
        
        $response3 = $collationTableControllerObject->automaticCollationPageGet($request2, $inputResp2, 
                NULL);
        $this->assertEquals(200, $response3->getStatusCode());
        
    }
    
    
    /**
     * @depends testChunkAndWitnessPage
     */
    public function testAutomaticCollationTableCustom(array $witnessInfo) {
        
        $work = $witnessInfo['work'];
        $chunkNo = $witnessInfo['chunk'];
        $lang = $witnessInfo['lang'];
        $editor1 = $witnessInfo['editors'][0];

        self::$ci['userInfo'] = ['id' => $editor1];
        self::$dm->um->allowUserTo($editor1, 'act-view-experimental-data');
        
        $collationTableControllerObject = new SiteCollationTable(self::$ci);
        
        // no data
        $request1 =  new ServerRequest('POST', '');
        $inputResp = new Response();
        $response1 = $collationTableControllerObject->automaticCollationPageCustom($request1, $inputResp, NULL);
        $this->assertEquals(200, $response1->getStatusCode());
        $this->assertNotFalse(strpos($response1->getBody(), SiteCollationTable::ERROR_SIGNATURE_PREFIX . SiteCollationTable::ERROR_NO_DATA));
        
        // No options in data
        $request2 = $this->requestWithData($request1, []);
        $response2 = $collationTableControllerObject->automaticCollationPageCustom($request2, $inputResp, NULL);
        $this->assertEquals(200, $response2->getStatusCode());
        $this->assertNotFalse(strpos($response2->getBody(), SiteCollationTable::ERROR_SIGNATURE_PREFIX . SiteCollationTable::ERROR_NO_OPTIONS));
        
        // Incomplete options
        $request3 = $this->requestWithData($request1, ['options' => []]);
        $response3 = $collationTableControllerObject->automaticCollationPageCustom($request3, $inputResp, NULL);
        $this->assertEquals(200, $response3->getStatusCode());
        $this->assertNotFalse(strpos($response3->getBody(), SiteCollationTable::ERROR_SIGNATURE_PREFIX . SiteCollationTable::ERROR_MISSING_REQUIRED_OPTION));
        
        
        // Enough options to go into the common collation table methods (tested above)
        $request4 = $this->requestWithData($request1, ['options' => [
            'work' => 'AW48',
            'chunk' => 24,
            'lang' => 'la',
            'ignorePunctuation' => true,
            'partialCollation' => true,
            'witnesses' => [3,4,5]
        ]]);
        $response4 = $collationTableControllerObject->automaticCollationPageCustom($request4, $inputResp, NULL);
        $this->assertEquals(200, $response4->getStatusCode());
    }
    
    
    /**
     * @depends testChunkAndWitnessPage
     */
    public function testAutomaticCollationTablePreset(array $witnessInfo) {
        
        $work = $witnessInfo['work'];
        $chunkNo = $witnessInfo['chunk'];
        $lang = $witnessInfo['lang'];
        $editor1 = $witnessInfo['editors'][0];

        self::$ci['userInfo'] = ['id' => $editor1];
        self::$dm->um->allowUserTo($editor1, 'act-view-experimental-data');
        
        $collationTableControllerObject = new SiteCollationTable(self::$ci);
        
        // Bad Preset
        $request1 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo) 
                ->withAttribute('preset', 131312321);
        
        $inputResp1 = new \Slim\Http\Response();
        
        $response1 = $collationTableControllerObject->automaticCollationPagePreset($request1, $inputResp1,  NULL);
        $this->assertEquals(200, $response1->getStatusCode());
        $this->assertNotFalse(strpos($response1->getBody(), SiteCollationTable::ERROR_SIGNATURE_PREFIX . SiteCollationTable::ERROR_UNKNOWN_PRESET));
        
        $presetManager = self::$ci->sm->getPresetsManager();
        $pf = new System\PresetFactory();
        $presetTitle = 'MyTestPreset';
        
        $preset = $pf->create(System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION, $editor1, $presetTitle, 
                ['lang' => $lang, 'ignorePunctuation' => true, 'witnesses' => [1,3,4]]);
        $this->assertTrue($presetManager->addPreset($preset));
        
        $presetId = $presetManager->getPreset(System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION, $editor1, $presetTitle)->getId();
        
        $request2 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo) 
                ->withAttribute('preset', $presetId);
        $inputResp2 = new \Slim\Http\Response();
        
        $response2 = $collationTableControllerObject->automaticCollationPagePreset($request2, $inputResp2,  NULL);
        $this->assertEquals(200, $response2->getStatusCode());
        
    }
    
    
    public function requestWithData($request, $data) {
        return $request->withBody(
            Psr7\stream_for(
                http_build_query(['data' => json_encode($data)])
            )
        );

    }
    
}
