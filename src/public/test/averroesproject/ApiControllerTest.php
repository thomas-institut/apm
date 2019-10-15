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

namespace AverroesProject;
require "../vendor/autoload.php";
require_once 'SiteMockup/DatabaseTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use AverroesProject\TxText\ItemArray;
use GuzzleHttp\Psr7;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;
use APM\Plugin\HookManager;

/**
 * Description of testApi
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApiControllerTest extends TestCase {
    
    static $ci;
    /**
     *
     * @var Api\ApiController
     */
    static $apiElements;
    static $apiUsers;
    static $apiDocuments;
    
    /*     
     * @var AverroesProject\Data\DataManager
     */
    static $dataManager;
    
    static $editor1;
    static $editor2;
    static $apiUserId;
    
    public static function setUpBeforeClass()
    {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('APITEST');
        $logger->pushHandler($logStream);
        $hm = new HookManager();

        self::$ci = DatabaseTestEnvironment::getContainer($logger);
        DatabaseTestEnvironment::emptyDatabase();
        self::$apiElements = new Api\ApiElements(self::$ci);
        self::$apiUsers = new Api\ApiUsers(self::$ci);
        self::$apiDocuments = new Api\ApiDocuments(self::$ci);
        self::$dataManager = DatabaseTestEnvironment::getDataManager($logger, $hm);
        self::$editor1 = self::$dataManager->userManager->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->userManager->createUserByUserName('testeditor2');
        self::$apiUserId = self::$dataManager->userManager->createUserByUserName('someUser');
        self::$ci['userId'] = self::$apiUserId;
    }
    
    public function testNumColumns()
    {
        $request = (new \GuzzleHttp\Psr7\ServerRequest('GET', ''))
                ->withAttribute('document', 100)
                ->withAttribute('page', 1);
        
        $inputResp = new \Slim\Http\Response();
        
        $response = self::$apiDocuments->getNumColumns($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(true), true);
        $this->assertEquals(0, $data);
    }
    
    public function testGetElements() 
    {
        // test on a non-existent page
        $request = (new \GuzzleHttp\Psr7\ServerRequest('GET', ''))
                ->withAttribute('document', 1)
                ->withAttribute('page', 1) 
                ->withAttribute('column', 1);
        
        $inputResp = new \Slim\Http\Response();
        $response = self::$apiElements->getElementsByDocPageCol($request, 
                $inputResp, NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(true), true);
        $this->assertEquals([], $data['elements']);
        $this->assertEquals([], $data['ednotes']);
        $this->assertEquals([self::$ci->userId], array_keys($data['people'])); // only test UserId
        $this->assertEquals(1, $data['info']['col']);
        
        
        $numElements = 5;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test API Doc', 'TA-1', $numPages, 'la', 
                'mss', 'local', 'TESTELEM-5');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editor = $dm->userManager->createUserByUsername('apieditor');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        $elementIds = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new ColumnElement\Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editor;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new TxText\Text(0,-1,"Original Line ". (string)($i+1)));  
            $elementIds[] = $dm->insertNewElement($element)->id;
        }
        $elementsInDb = $dm->getColumnElementsByPageId($pageId, 1);
        
        $request2 = (new \GuzzleHttp\Psr7\ServerRequest('GET', ''))
                ->withAttribute('document', $docId)
                ->withAttribute('page', 1) 
                ->withAttribute('column', 1);
        
        $inputResp2 = new \Slim\Http\Response();
        $response2 = self::$apiElements->getElementsByDocPageCol($request, 
                $inputResp2, null);
        
        $this->assertEquals(200, $response2->getStatusCode());
        $data2 = json_decode($response2->getBody(true), true);
        
        $this->assertCount($numElements, $data2['elements']);
        $this->assertEquals([], $data['ednotes']);
        
        foreach ($data2['elements'] as $ele) {
            $this->assertEquals(ColumnElement\Element::LINE, $ele['type']);
            $this->assertEquals($pageId, $ele['pageId']);
            $this->assertEquals(1, $ele['columnNumber']);
            $this->assertEquals($editor, $ele['editorId']);
            $this->assertEquals('la', $ele['lang']);
            $this->assertEquals(0, $ele['handId']);
            $this->assertCount(1, $ele['items']);
        }
        
        return $docId;
    }
    

    public function testUpdateColumnElements()
    {
        $dm = self::$dataManager;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test API Doc 2', 'TA-2', $numPages, 'la', 
                'mss', 'local', 'TESTELEM');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        //print ('DocId = ' . $docId . "\n");
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        
        $request = (new \GuzzleHttp\Psr7\ServerRequest('POST', ''))
                ->withAttribute('document', $docId)
                ->withAttribute('page', 1) 
                ->withAttribute('column', 1);
        $inputResp = new \Slim\Http\Response();
        
        // TEST 1: nothing in request contents
        $response = self::$apiElements->updateElementsByDocPageCol(
                $request, 
                $inputResp, 
                null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_DATA, $respData['error']);
        
        
        // TEST 2: unstructured data in request contents
        $response = self::$apiElements->updateElementsByDocPageCol(
                $request->withBody(Psr7\stream_for('Some data')), 
                $inputResp, 
                null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_DATA, $respData['error']);
        
        // TEST 3: wrong POST field
        $queryString = http_build_query([ 'somefield' => 'some data'], '', '&');
        $response = self::$apiElements->updateElementsByDocPageCol(
                $request->withBody(Psr7\stream_for($queryString)), 
                $inputResp, 
                null 
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_DATA, $respData['error']);
        
        // TEST 4: empty data
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, []), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_ELEMENT_ARRAY, $respData['error']);
        
        // TEST 4: wrong data fields 
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, ['somefield' => 'somedata']), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_ELEMENT_ARRAY, $respData['error']);
        
        // TEST 5: no ednotes
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                'elements' => [
                    ['id' => 100, 'type' => 1]
                ]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_EDNOTES, $respData['error']);
        
        // TEST 6: zero elements
         $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                'elements' => [], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_ZERO_ELEMENTS, $respData['error']);
        
        $textItem = [
            'id'=> 100, 
            'type'=> Item::TEXT, 
            'columnElementId' => -1,
            'seq'=> 0, 
            'lang'=> 'la',
            'theText' => 'Some text ',
            'altText' => '',
            'extraInfo' => '',
            'target' => null
        ];
        $goodElement = [ 
            'id' => -1,
            'pageId' => $pageId,
            'columnNumber' => 1,
            'seq' => 0,
            'type' => Element::LINE,
            'lang' => 'la',
            'handId' => 0,
            'editorId' => self::$editor1,
            'items' => [ $textItem ], 
            'reference' => '1',
            'placement' => null
        ];
        
        // TEST 7: missing key in element
        $keys = array_keys($goodElement);
        for ($i = 0; $i < count($keys); $i++) {
            $badElement = $goodElement;
            unset($badElement[$keys[$i]]);
            $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                    'elements' => [
                        $badElement
                    ], 
                    'ednotes' => []
                ]), 
                $inputResp, 
                null
            );
            $this->assertEquals(409, $response->getStatusCode());
            $respData = json_decode($response->getBody(true), true);
            $this->assertEquals(Api\ApiController::API_ERROR_MISSING_ELEMENT_KEY, $respData['error']);
        }
        
        // TEST 8: bad pageId
        $badElement = $goodElement;
        $badElement['pageId'] = 0;
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $badElement
                ], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_WRONG_PAGE_ID, $respData['error']);
        
        // TEST 8: bad columnElement
        $badElement = $goodElement;
        $badElement['columnNumber'] = 0;
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $badElement
                ], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_WRONG_COLUMN_NUMBER, $respData['error']);
        
        // TEST 8: bad editorId
        $badElement = $goodElement;
        $badElement['editorId'] = -1;
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $badElement
                ], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_WRONG_EDITOR_ID, $respData['error']);
        
        // TEST 9: no items
        $badElement = $goodElement;
        $badElement['items'] = [];
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $badElement
                ], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_EMPTY_ELEMENT, $respData['error']);
        
        // TEST 10: badly formed items
        $keys = array_keys($textItem);
        for ($i = 0; $i < count($keys); $i++) {
            $badItem = $textItem;
            unset($badItem[$keys[$i]]);
            $badElement['items'] = [$badItem];
            $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                    'elements' => [
                        $badElement
                    ], 
                    'ednotes' => []
                ]), 
                $inputResp, 
                null
            );
            $this->assertEquals(409, $response->getStatusCode());
            $respData = json_decode($response->getBody(true), true);
            $this->assertEquals(Api\ApiController::API_ERROR_MISSING_ITEM_KEY, $respData['error']);
        }

        // TEST 11: duplicate Item Ids
        $badElement = $goodElement;
        $item1 = $textItem;
        $item2 = $textItem;
        $item1['id'] = 100;
        $item2['id'] = 100;
        $badElement['items'] = [ $item1, $item2];
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $badElement
                ], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_DUPLICATE_ITEM_ID, $respData['error']);
        
        // FINALLY do it!
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(200, $response->getStatusCode());
        
        // Get the elements back
        $elementsInDb = $dm->getColumnElements($docId, 1, 1);
        
        $this->assertCount(1, $elementsInDb);
        $this->assertEquals($goodElement['pageId'], $elementsInDb[0]->pageId);
        $this->assertEquals($goodElement['columnNumber'], $elementsInDb[0]->columnNumber);
        $this->assertEquals($goodElement['seq'], $elementsInDb[0]->seq);
        $this->assertEquals($goodElement['type'], $elementsInDb[0]->type); 
        $this->assertEquals($goodElement['lang'], $elementsInDb[0]->lang);
        $this->assertEquals($goodElement['handId'], $elementsInDb[0]->handId);
        $this->assertEquals($goodElement['editorId'], $elementsInDb[0]->editorId);
        $this->assertEquals($goodElement['reference'], $elementsInDb[0]->reference);
        $this->assertEquals($goodElement['placement'], $elementsInDb[0]->placement);
        $this->assertCount(1, $elementsInDb[0]->items);
        $itemInDb = $elementsInDb[0]->items[0];
        $this->assertEquals($textItem['type'], $itemInDb->type);
        $this->assertEquals($textItem['seq'], $itemInDb->seq);
        $this->assertEquals($textItem['lang'], $itemInDb->lang);
        $this->assertEquals($textItem['theText'], $itemInDb->theText);
        $this->assertEquals($textItem['altText'], $itemInDb->altText);
        $this->assertEquals($textItem['extraInfo'], $itemInDb->extraInfo);
        $this->assertEquals($textItem['target'], $itemInDb->target);
         
        // Now for a simple update
        $abbrItem = $textItem;
        $abbrItem['id'] = $textItem['id'] + 1;
        $abbrItem['type'] = Item::ABBREVIATION;
        $abbrItem['theText'] = 'Mr.';
        $abbrItem['altText'] = "Mister";
        $abbrItem['seq'] = $textItem['seq'] + 1;
        $goodElement['editorId'] = self::$editor2;
        $goodElement['items'] = [ $textItem, $abbrItem];
        
        
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(200, $response->getStatusCode());
        
        // Get the elements back
        $elementsInDb = $dm->getColumnElements($docId, 1, 1);
        
        $this->assertCount(1, $elementsInDb);
        $this->assertEquals($goodElement['pageId'], $elementsInDb[0]->pageId);
        $this->assertEquals($goodElement['columnNumber'], $elementsInDb[0]->columnNumber);
        $this->assertEquals($goodElement['seq'], $elementsInDb[0]->seq);
        $this->assertEquals($goodElement['type'], $elementsInDb[0]->type); 
        $this->assertEquals($goodElement['lang'], $elementsInDb[0]->lang);
        $this->assertEquals($goodElement['handId'], $elementsInDb[0]->handId);
        $this->assertEquals($goodElement['editorId'], $elementsInDb[0]->editorId);
        $this->assertEquals($goodElement['reference'], $elementsInDb[0]->reference);
        $this->assertEquals($goodElement['placement'], $elementsInDb[0]->placement);
        $this->assertCount(2, $elementsInDb[0]->items);
        $itemInDb = $elementsInDb[0]->items[0];
        $this->assertEquals($textItem['type'], $itemInDb->type);
        $this->assertEquals($textItem['seq'], $itemInDb->seq);
        $this->assertEquals($textItem['lang'], $itemInDb->lang);
        $this->assertEquals($textItem['theText'], $itemInDb->theText);
        $this->assertEquals($textItem['altText'], $itemInDb->altText);
        $this->assertEquals($textItem['extraInfo'], $itemInDb->extraInfo);
        $this->assertEquals($textItem['target'], $itemInDb->target);
        $itemInDb2 = $elementsInDb[0]->items[1];
        $this->assertEquals($abbrItem['type'], $itemInDb2->type);
        $this->assertEquals($abbrItem['seq'], $itemInDb2->seq);
        $this->assertEquals($abbrItem['lang'], $itemInDb2->lang);
        $this->assertEquals($abbrItem['theText'], $itemInDb2->theText);
        $this->assertEquals($abbrItem['altText'], $itemInDb2->altText);
        $this->assertEquals($abbrItem['extraInfo'], $itemInDb2->extraInfo);
        $this->assertEquals($abbrItem['target'], $itemInDb2->target);
        
        $goodEditorialNote = [ 
            'id' => -1,
            'type' => EditorialNote::INLINE,
            'target' => $abbrItem['id'],
            'authorId' => self::$editor1,
            'text' =>  'This is an editorial note',
        ];
        
        // TEST: badly formed editorial notes
        $keys = array_keys($goodEditorialNote);
        for ($i = 0; $i < count($keys); $i++) {
            $badEdNote = $goodEditorialNote;
            unset($badEdNote[$keys[$i]]);
            $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                    'elements' => [
                        $goodElement
                    ], 
                    'ednotes' => [ $badEdNote]
                ]), 
                $inputResp, 
                null
            );
            $this->assertEquals(409, $response->getStatusCode());
            $respData = json_decode($response->getBody(true), true);
            $this->assertEquals(Api\ApiController::API_ERROR_MISSING_EDNOTE_KEY, $respData['error']);
        }
        
        // TEST: Bad target in editorial note
        $badEdNote = $goodEditorialNote;
        $badEdNote['target'] = $abbrItem['id'] + 1;
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ], 
                'ednotes' => [ $badEdNote]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_WRONG_TARGET_FOR_EDNOTE, $respData['error']);
        
        // TEST: Bad authorId in editorial note
        $badEdNote = $goodEditorialNote;
        $badEdNote['authorId'] = 0;
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ], 
                'ednotes' => [ $badEdNote]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(Api\ApiController::API_ERROR_WRONG_AUTHOR_ID, $respData['error']);
        
        // TEST: Add an ednote
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ], 
                'ednotes' => [ $goodEditorialNote ]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(200, $response->getStatusCode());
        $edNotesInDb = $dm->edNoteManager->getEditorialNotesByDocPageCol($docId, 1, 1);
        $this->assertCount(1, $edNotesInDb);
        $this->assertEquals($goodEditorialNote['authorId'], $edNotesInDb[0]->authorId);
        $this->assertEquals($goodEditorialNote['text'], $edNotesInDb[0]->text);
        
        // TEST: update with same ednote, no change in DB
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ], 
                'ednotes' => [ $goodEditorialNote ]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(200, $response->getStatusCode());
        $edNotesInDb = $dm->edNoteManager->getEditorialNotesByDocPageCol($docId, 1, 1);
        $this->assertCount(1, $edNotesInDb);
        $this->assertEquals($goodEditorialNote['authorId'], $edNotesInDb[0]->authorId);
        $this->assertEquals($goodEditorialNote['text'], $edNotesInDb[0]->text);
        
        
        // TEST: update with a new ednote, should have 2 ednotes in column
        $goodEditorialNote2 = $goodEditorialNote;
        $goodEditorialNote2['authorId'] = self::$editor2;
        $response = self::$apiElements->updateElementsByDocPageCol(
        self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ], 
                'ednotes' => [ $goodEditorialNote2 ]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(200, $response->getStatusCode());
        $edNotesInDb = $dm->edNoteManager->getEditorialNotesByDocPageCol($docId, 1, 1);
        $this->assertCount(2, $edNotesInDb);
        $this->assertEquals($goodEditorialNote['authorId'], $edNotesInDb[0]->authorId);
        $this->assertEquals($goodEditorialNote['text'], $edNotesInDb[0]->text);
        $this->assertEquals($goodEditorialNote2['authorId'], $edNotesInDb[1]->authorId);
        $this->assertEquals($goodEditorialNote2['text'], $edNotesInDb[1]->text);
    }
    
    public static function requestWithData($request, $data) {
        return $request->withBody(
            Psr7\stream_for(
                http_build_query(['data' => json_encode($data)])
            )
        );

    }
    
}
