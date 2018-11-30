<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
require "../vendor/autoload.php";
require_once 'averroesproject/SiteMockup/SiteTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use GuzzleHttp\Psr7\ServerRequest;


/**
 * Description of TestAuthenticator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Ap2APMSiteControllerTest extends TestCase {
     static $ci;
     /*     
     * @var AverroesProject\Data\DataManager
     */
    static $dataManager;
    
    static $editor1;
    static $editor2;
    
    public static function setUpBeforeClass()
    {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('SITETEST');
        $logger->pushHandler($logStream);
        $hm = new Plugin\HookManager();

        self::$ci = SiteTestEnvironment::getContainer($logger);
        self::$dataManager = DatabaseTestEnvironment::getDataManager($logger, $hm);
        
        DatabaseTestEnvironment::emptyDatabase();
        
        self::$editor1 = self::$dataManager->um->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->um->createUserByUserName('testeditor2');
    }
    
    public function testChunkAndWitnessPage()
    {
        $work = 'AW47';
        $chunkNo = 1;
        
        $numPages = 5;
        $dm = self::$dataManager;
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
        
        // A valid witness in doc 1
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        $element = new ColumnElement\Line();
        $element->pageId = $pageId;
        $element->columnNumber = 1;
        $element->editorId = $editor;
        $element->lang = 'la';
        $element->handId = 0;
        $element->seq = 0;
        $itemSeq=0;
        $itemId = 0;
        TxText\ItemArray::addItem($element->items, new TxText\ChunkMark($itemId++, $itemSeq++, $work, $chunkNo, 'start', 1));  
        // Some items to try to hit all formatting cases too!
        TxText\ItemArray::addItem($element->items, new TxText\Text($itemId++,$itemSeq++,"The text of the chunk: "));  
        TxText\ItemArray::addItem($element->items, new TxText\Rubric($itemId++,$itemSeq++,"a rubric"));  
        TxText\ItemArray::addItem($element->items, new TxText\Sic($itemId++,$itemSeq++,"sic", "correction")); 
        TxText\ItemArray::addItem($element->items, new TxText\Sic($itemId++,$itemSeq++,"sic2")); 
        TxText\ItemArray::addItem($element->items, new TxText\Unclear($itemId++,$itemSeq++,"unclear", "first reading")); 
        TxText\ItemArray::addItem($element->items, new TxText\Deletion($itemId++,$itemSeq++,"a deletion", 'strikeout'));  
        TxText\ItemArray::addItem($element->items, new TxText\MarginalMark($itemId++,$itemSeq++,'[REF]'));  
        TxText\ItemArray::addItem($element->items, new TxText\Addition($itemId++,$itemSeq++,"an addition", 'margin right')); 
        TxText\ItemArray::addItem($element->items, new TxText\Text($itemId++,$itemSeq++,"a word that cont"));  
        TxText\ItemArray::addItem($element->items, new TxText\NoWordBreak($itemId++,$itemSeq++));  
        TxText\ItemArray::addItem($element->items, new TxText\Text($itemId++,$itemSeq++,"\ntinues in the next line"));  
        TxText\ItemArray::addItem($element->items, new TxText\Mark($itemId++,$itemSeq++));  
        TxText\ItemArray::addItem($element->items, new TxText\ChunkMark($itemId++, $itemSeq++, $work, $chunkNo, 'end', 1));  
        $dm->insertNewElement($element)->id;
        
        // An invalid witness in doc 2
        $pageId2 =  $dm->getPageIdByDocPage($docId2, 1);
        $element2 = new ColumnElement\Line();
        $element2->pageId = $pageId2;
        $element2->columnNumber = 1;
        $element2->editorId = $editor;
        $element2->lang = 'la';
        $element2->handId = 0;
        $element2->seq = 0;
        $itemSeq=0;
        TxText\ItemArray::addItem($element2->items, new TxText\ChunkMark($itemId++,$itemSeq++, $work, $chunkNo, 'start', 1));  
        TxText\ItemArray::addItem($element2->items, new TxText\Text($itemId++,$itemSeq++,"The text of the chunk"));  
        $dm->insertNewElement($element2)->id;
        
        // No witness at all in doc 3
        $pageId3 =  $dm->getPageIdByDocPage($docId3, 1);
        $element3 = new ColumnElement\Line();
        $element3->pageId = $pageId3;
        $element3->columnNumber = 1;
        $element3->editorId = $editor;
        $element3->lang = 'la';
        $element3->handId = 0;
        $element3->seq = 0;
        $itemSeq=0;
        TxText\ItemArray::addItem($element3->items, new TxText\Text($itemId++,$itemSeq++,"Text outside of the chunk"));  
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
        $witnessPageObject = new \AverroesProjectToApm\Site\WitnessPage(self::$ci);
        $response = $witnessPageObject->witnessPage($request, $inputResp, 
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
        $witnessPageObject2 = new \AverroesProjectToApm\Site\WitnessPage(self::$ci);
        $response2 = $witnessPageObject2->witnessPage($request2, $inputResp2, 
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
        $witnessPageObject3 = new \AverroesProjectToApm\Site\WitnessPage(self::$ci);
        $response3 = $witnessPageObject3->witnessPage($request3, $inputResp3, 
                NULL);
        $this->assertEquals(200, $response3->getStatusCode());
        
        // Chunk page test
        $request1_1 = (new ServerRequest('GET', ''))
                ->withAttribute('work', $work)
                ->withAttribute('chunk', $chunkNo);
        $inputResp1_1 = new \Slim\Http\Response();
        
        
        $chunkPageObject = new \AverroesProjectToApm\Site\ChunkPage(self::$ci);
        
        
        $response1_1 = $chunkPageObject->singleChunkPage($request1_1, $inputResp1_1, 
                NULL);
        
        $this->assertEquals(200, $response1_1->getStatusCode());
        
    }
    
  
    
    
}
