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
require_once 'SiteMockup/DatabaseTestEnvironment.php';
require_once 'SiteMockup/testconfig.php';


use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use GuzzleHttp\Psr7;

use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\Text;
use AverroesProject\ColumnElement\Line;
use AverroesProject\TxText\ItemArray;

use APM\Api\ApiController;
use APM\Api\ApiCollation;


/**
 * API call tests
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApiControllerTest extends TestCase {
    
    
    static $testEnvironment;
    
    static $ci;
    /**
     *
     * @var Api\ApiCollation
     */
    static $apiCollation;
    
    /*     
     * @var AverroesProject\Data\DataManager
     */
    static $dataManager;
    
    
    static $editor1;
    static $editor2;
    
    public static function setUpBeforeClass()
    {
        global $apmTestConfig;
        
       
        self::$testEnvironment = new DatabaseTestEnvironment($apmTestConfig);
        self::$ci = self::$testEnvironment->getContainer();
         
        self::$testEnvironment->emptyDatabase();
        
        
        self::$dataManager = self::$ci->db;
        self::$editor1 = self::$dataManager->um->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->um->createUserByUserName('testeditor2');
        
        
        // API controllers to test
        self::$apiCollation = new ApiCollation(self::$ci);
    }
    

    public function testQuickCollation()
    {
        $request = (new \GuzzleHttp\Psr7\ServerRequest('POST', ''));
        $inputResp = new \Slim\Http\Response();
        
        // No data
        $response = self::$apiCollation->quickCollation(
            $request, 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiController::API_ERROR_NO_DATA, $respData['error']);
     
        // No witnesses
        $response = self::$apiCollation->quickCollation(
            self::requestWithData($request, [
                'somekey' => 'somevalue'
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiController::API_ERROR_MISSING_REQUIRED_FIELD, $respData['error']);
        
        // Less than two witnesses
        $response = self::$apiCollation->quickCollation(
            self::requestWithData($request, [
                'witnesses' => []
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiCollation::ERROR_NOT_ENOUGH_WITNESSES, $respData['error']);
        
       
        // Bad witness
        $response = self::$apiCollation->quickCollation(
            self::requestWithData($request, [
                'witnesses' => [ 
                    [
                        'id' => 'Test', 
                        'text' => 'Some text' 
                    ], 
                    [
                        'id' => 'Test 2'  
                         // Missing text
                    ]]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiCollation::ERROR_BAD_WITNESS, $respData['error']);
        
        // Now for real!!
       $response = self::$apiCollation->quickCollation(
            self::requestWithData($request, [
                'witnesses' => [ 
                    [
                        'id' => 'A', 
                        'text' => 'Some text' 
                    ], 
                    [
                        'id' => 'B' ,
                        'text' => 'Some other text'
                    ]]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(200, $response->getStatusCode());
        
    }
    
    public function testAutomaticCollation() {
        
        $work = 'AW47';
        $chunk = 1;
        $lang = 'la';
        $otherLang = 'he';
        $numGoodWitnesses = 5;
        $numBadWitnesses = 2;
        
        $request = (new \GuzzleHttp\Psr7\ServerRequest('POST', ''));
        $inputResp = new \Slim\Http\Response();
        
        // No data
        $response = self::$apiCollation->automaticCollation(
            $request, 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiController::API_ERROR_NO_DATA, $respData['error']);
     
        // No valid fields in data
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'somekey' => 'somevalue'
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiController::API_ERROR_MISSING_REQUIRED_FIELD, $respData['error']);
        
        // Less than two witnesses in partial collation
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => $lang,
                'witnesses' => [ [ 'type' => 'doc',  'id' => 1]]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiCollation::ERROR_NOT_ENOUGH_WITNESSES, $respData['error']);
        
        
        // Invalid language
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => 'tagalog',
                'witnesses' => []  // i.e., collate ALL witnesses
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiCollation::ERROR_INVALID_LANGUAGE, $respData['error']);
        
        // Less than two witnesses in the database
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => $lang,
                'witnesses' => []  // i.e., collate ALL witnesses
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiCollation::ERROR_NOT_ENOUGH_WITNESSES, $respData['error']);
        
        
        $docIds = $this->createWitnessesInDb($work, $chunk, $lang, self::$editor1, $numGoodWitnesses, $numBadWitnesses);
        array_merge($docIds, $this->createWitnessesInDb($work, $chunk, $otherLang, self::$editor1, $numGoodWitnesses, $numBadWitnesses));
        
        // This one should work!
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => $lang,
                'witnesses' => []  // i.e., collate ALL witnesses
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(200, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        
        $this->assertTrue(isset($respData['collationTable']));
        $this->assertTrue(isset($respData['sigla']));
        $this->assertTrue(isset($respData['collationEngineDetails']));
        
        // a partial collation
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => $lang,
                'witnesses' => [
                    ['type' => 'doc', 'id'=> $docIds[1]],
                    ['type' => 'doc', 'id'=> $docIds[2]],
                    ['type' => 'doc', 'id'=> $docIds[3]],
                    ]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(200, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertTrue(isset($respData['collationTable']));
        $this->assertTrue(isset($respData['sigla']));
        $this->assertTrue(isset($respData['collationEngineDetails']));
        
        // a partial collation with wrong doc ids
        $badId = max($docIds)+1;
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => $lang,
                'witnesses' => [
                    ['type' => 'doc', 'id'=> $docIds[1]],
                    ['type' => 'doc', 'id'=> $badId++],
                    ['type' => 'doc', 'id'=> $badId],
                    ]
            ]), 
            $inputResp, 
            null
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(true), true);
        $this->assertEquals(ApiCollation::ERROR_NOT_ENOUGH_WITNESSES, $respData['error']);
      
        
    }
    
    public static function requestWithData($request, $data) {
        return $request->withBody(
            Psr7\stream_for(
                http_build_query(['data' => json_encode($data)])
            )
        );

    }
    
    private function createWitnessesInDb($work, $chunk, $lang, $editor, $numGoodWitnesses, $numBadWitnesses) {
        $dm = self::$dataManager;
        
        $witnessNumber = 1;
        $docIds = [];
        for($i=0; $i< $numGoodWitnesses; $i++) {
            $docId = $dm->newDoc('TestWitness' . $witnessNumber, 'TW-1', 1, $lang, 
                'mss', 'local', 'TESTWITNESS' . $witnessNumber);
            $pageId =  $dm->getPageIdByDocPage($docId, 1);
            $dm->addNewColumn($docId, 1);
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editor;
            $element->lang = $lang;
            $element->handId = 0;
            $element->seq = 0;
            $itemSeq=0;
            $itemId = 0;
            ItemArray::addItem($element->items, new ChunkMark($itemId++, $itemSeq++, $work, $chunk, 'start', 1));  
            ItemArray::addItem($element->items, new Text($itemId++,$itemSeq++,"The text of the chunk, witness " . $witnessNumber));
            ItemArray::addItem($element->items, new ChunkMark($itemId++, $itemSeq++, $work, $chunk, 'end', 1));  
            $dm->insertNewElement($element);
            $witnessNumber++;
            $docIds[] = $docId;
        }
        
        for($i=0; $i< $numBadWitnesses; $i++) {
            $docId = $dm->newDoc('TestWitness' . $witnessNumber . ' (bad)', 'TW-1', 1, $lang, 
                'mss', 'local', 'TESTWITNESS' . $witnessNumber);
            $pageId =  $dm->getPageIdByDocPage($docId, 1);
            $dm->addNewColumn($docId, 1);
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editor;
            $element->lang = $lang;
            $element->handId = 0;
            $element->seq = 0;
            $itemSeq=0;
            $itemId = 0;
            ItemArray::addItem($element->items, new ChunkMark($itemId++, $itemSeq++, $work, $chunk, 'start', 1));  
            ItemArray::addItem($element->items, new Text($itemId++,$itemSeq++,"The text of the chunk, (bad) witness " . $witnessNumber));  
            $dm->insertNewElement($element);
            $witnessNumber++;
            $docIds[] = $docId;
        }
        
        return $docIds;
        
    }
    
}
