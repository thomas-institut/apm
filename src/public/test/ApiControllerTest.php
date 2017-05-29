<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
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
require_once 'DatabaseTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use AverroesProject\TxText\ItemArray;
use GuzzleHttp\Psr7;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;

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
    static $apiController;
    
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
        $logger = new Logger('APITEST');
        $logger->pushHandler($logStream);

        self::$ci = DatabaseTestEnvironment::getContainer($logger);
        DatabaseTestEnvironment::emptyDatabase();
        self::$apiController = new Api\ApiController(self::$ci);
        self::$dataManager = DatabaseTestEnvironment::getDataManager($logger);
        self::$editor1 = self::$dataManager->um->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->um->createUserByUserName('testeditor2');
    }
    
    public function testNumColumns()
    {
        $request = (new \GuzzleHttp\Psr7\ServerRequest('GET', ''))
                ->withAttribute('document', 100)
                ->withAttribute('page', 1);
        
        $inputResp = new \Slim\Http\Response();
        
        $response = self::$apiController->getNumColumns($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(true), true);
        $this->assertEquals(0, $data);
    }
    
    public function testGetElements() 
    {
        $request = (new \GuzzleHttp\Psr7\ServerRequest('GET', ''))
                ->withAttribute('document', 1)
                ->withAttribute('page', 1) 
                ->withAttribute('column', 1);
        
        $inputResp = new \Slim\Http\Response();
        $response = self::$apiController->getElementsByDocPageCol($request, 
                $inputResp, NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(true), true);
        $this->assertEquals([], $data['elements']);
        $this->assertEquals([], $data['ednotes']);
        $this->assertEquals([1 => false], $data['people']); // only test UserId
        $this->assertEquals(1, $data['info']['col']);
        
        
        $numElements = 5;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test API Doc', 'TA-1', $numPages, 'la', 
                'mss', 'local', 'TESTELEM-5');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editor = $dm->um->createUserByUsername('apieditor');
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
        $response2 = self::$apiController->getElementsByDocPageCol($request, 
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
        print ('DocId = ' . $docId . "\n");
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        
        $request = (new \GuzzleHttp\Psr7\ServerRequest('POST', ''))
                ->withAttribute('document', $docId)
                ->withAttribute('page', 1) 
                ->withAttribute('column', 1);
        $inputResp = new \Slim\Http\Response();
        
        // TEST 1: nothing in request contents
        $response = self::$apiController->updateElementsByDocPageCol(
                $request, 
                $inputResp, 
                null
        );
        $this->assertEquals(409, $response->getStatusCode());
        
        
        // TEST 2: unstructured data in request contents
        $response = self::$apiController->updateElementsByDocPageCol(
                $request->withBody(Psr7\stream_for('Some data')), 
                $inputResp, 
                null
        );
        $this->assertEquals(409, $response->getStatusCode());
        
        // TEST 3: wrong POST field
        $queryString = http_build_query([ 'somefield' => 'some data'], '', '&');
        $response = self::$apiController->updateElementsByDocPageCol(
                $request->withBody(Psr7\stream_for($queryString)), 
                $inputResp, 
                null 
        );
        $this->assertEquals(409, $response->getStatusCode());
        
        // TEST 4: empty data
        $response = self::$apiController->updateElementsByDocPageCol(
            self::requestWithData($request, []), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        
        // TEST 4: wrong data fields 
        $response = self::$apiController->updateElementsByDocPageCol(
            self::requestWithData($request, ['somefield' => 'somedata']), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        
        // TEST 5: no ednotes
        $response = self::$apiController->updateElementsByDocPageCol(
            self::requestWithData($request, [
                'elements' => [
                    ['id' => 100, 'type' => 1]
                ]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        
        // TEST 6: zero elements
         $response = self::$apiController->updateElementsByDocPageCol(
            self::requestWithData($request, [
                'elements' => [], 
                'ednotes' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        
        $textItem = [
            'id'=> -1, 
            'type'=> Item::TEXT, 
            'columnElementId' => -1,
            'seq'=> 0, 
            'lang'=> 'la',
            'theText' => 'Some text',
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
            $response = self::$apiController->updateElementsByDocPageCol(
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
        }
        
        // TEST 8: bad pageId
        $badElement = $goodElement;
        $badElement['pageId'] = 0;
        $response = self::$apiController->updateElementsByDocPageCol(
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
        
        // TEST 8: bad columnElement
        $badElement = $goodElement;
        $badElement['columnNumber'] = 0;
        $response = self::$apiController->updateElementsByDocPageCol(
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
        
        // TEST 8: bad editorId
        $badElement = $goodElement;
        $badElement['editorId'] = -1;
        $response = self::$apiController->updateElementsByDocPageCol(
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
        
        // TEST 9: no items
        $badElement = $goodElement;
        $badElement['items'] = [];
        $response = self::$apiController->updateElementsByDocPageCol(
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
        
        // TEST 10: badly formed items
        $keys = array_keys($textItem);
        for ($i = 0; $i < count($keys); $i++) {
            $badItem = $textItem;
            unset($badItem[$keys[$i]]);
            $badElement['items'] = [$badItem];
            $response = self::$apiController->updateElementsByDocPageCol(
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
        }

        // TEST 11: duplicate Item Ids
        $badElement = $goodElement;
        $item1 = $textItem;
        $item2 = $textItem;
        $item1['id'] = 100;
        $item2['id'] = 100;
        $badElement['items'] = [ $item1, $item2];
        $response = self::$apiController->updateElementsByDocPageCol(
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
        
        
        // FINALLY do it!
        $response = self::$apiController->updateElementsByDocPageCol(
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
    }
    
    public static function requestWithData($request, $data) {
        return $request->withBody(
            Psr7\stream_for(
                http_build_query(['data' => json_encode($data)])
            )
        );

    }
    
    
}
