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


use APM\System\ApmSystemManager;
use APM\System\PresetFactory;
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Psr7;

use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\Text;
use AverroesProject\ColumnElement\Line;
use AverroesProject\TxText\ItemArray;

use APM\Api\ApiController;
use APM\Api\ApiCollation;
use APM\Api\ApiPresets;

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
    
    /**
     *
     * @var Api\ApiPresets
     */
    static $apiPresets;
    
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

        self::$dataManager = self::$ci->db;


        // API controllers to test
        self::$apiCollation = new ApiCollation(self::$ci);
        self::$apiPresets = new ApiPresets(self::$ci);
    }
    

    public function testQuickCollation()
    {
        self::$testEnvironment->emptyDatabase();
        self::$editor1 = self::$dataManager->um->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->um->createUserByUserName('testeditor2');

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

        self::$testEnvironment->emptyDatabase();
        self::$editor1 = self::$dataManager->um->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->um->createUserByUserName('testeditor2');

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

    public function testGetPresets() {

        $lang = 'la';

        self::$testEnvironment->emptyDatabase();
        self::$editor1 = self::$dataManager->um->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->um->createUserByUserName('testeditor2');
        $request = (new \GuzzleHttp\Psr7\ServerRequest('POST', ''));
        $inputResp = new \Slim\Http\Response();

        $response1 = self::$apiPresets->getPresets($request, $inputResp, null);

        $this->assertEquals(409, $response1->getStatusCode());

        // Empty tool
        $request2 = self::requestWithData($request,
            ['tool' => '',
                'userId' => self::$editor1,
                'keyArrayToMatch' => []]);

        $response2 = self::$apiPresets->getPresets($request2, $inputResp, null);

        $this->assertEquals(409, $response2->getStatusCode());
        $respData2 = json_decode($response2->getBody(true), true);
        $this->assertEquals(ApiPresets::API_ERROR_WRONG_TYPE, $respData2['error']);

        // Invalid tool
        $request3 = self::requestWithData($request,
            ['tool' => 'sometool',
                'userId' => self::$editor1,
                'keyArrayToMatch' => []]);

        $response3 = self::$apiPresets->getPresets($request3, $inputResp, null);

        $this->assertEquals(409, $response3->getStatusCode());
        $respData3 = json_decode($response3->getBody(true), true);
        $this->assertEquals(ApiPresets::API_ERROR_UNRECOGNIZED_TOOL, $respData3['error']);

        // Invalid keyArraytoMatch
        $request4 = self::requestWithData($request,
            ['tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => self::$editor1,
                'keyArrayToMatch' => 'not an array']);

        $response4 = self::$apiPresets->getPresets($request4, $inputResp, null);

        $this->assertEquals(409, $response4->getStatusCode());
        $respData4 = json_decode($response4->getBody(true), true);
        $this->assertEquals(ApiPresets::API_ERROR_WRONG_TYPE, $respData4['error']);

        // No presets returned
        $request5 = self::requestWithData($request,
            ['tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => self::$editor1,
                'keyArrayToMatch' => []]);

        $response5 = self::$apiPresets->getPresets($request5, $inputResp, null);

        $this->assertEquals(200, $response5->getStatusCode());
        $respData5 = json_decode($response5->getBody(true), true);
        $this->assertEquals([], $respData5['presets']);

        // Get some presets in
        $presetManager = self::$ci->sm->getPresetsManager();
        $pf = new System\PresetFactory();
        $presetTitle = 'MyTestPreset';

        $witnesses = [1,3,4];
        $preset = $pf->create(System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION, self::$editor1, $presetTitle,
            ['lang' => $lang, 'ignorePunctuation' => true, 'witnesses' => $witnesses]);
        $this->assertTrue($presetManager->addPreset($preset));

        // try again with one preset in the database
        $request6 = self::requestWithData($request,
            ['tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => self::$editor1,
                'keyArrayToMatch' => []]);
        $response6 = self::$apiPresets->getPresets($request6, $inputResp, null);
        $this->assertEquals(200, $response6->getStatusCode());
        $respData6 = json_decode($response6->getBody(true), true);
        $this->assertCount(1, $respData6['presets']);

        $this->assertEquals(self::$editor1, $respData6['presets'][0]['userId']);
        $this->assertEquals($lang, $respData6['presets'][0]['data']['lang']);
        $this->assertEquals($witnesses, $respData6['presets'][0]['data']['witnesses']);

        //try again without userId
        $request7 = self::requestWithData($request,
            ['tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => false,
                'keyArrayToMatch' => []]);
        $response7 = self::$apiPresets->getPresets($request7, $inputResp, null);
        $this->assertEquals(200, $response7->getStatusCode());
        $respData7 = json_decode($response7->getBody(true), true);
        $this->assertCount(1, $respData7['presets']);

        $this->assertEquals(self::$editor1, $respData7['presets'][0]['userId']);
        $this->assertEquals($lang, $respData7['presets'][0]['data']['lang']);
        $this->assertEquals($witnesses, $respData7['presets'][0]['data']['witnesses']);

        return $respData7['presets'][0];
    }

    /**
     * @depends testGetPresets
     */
    public function testGetAutomaticCollationPresets(array $presetData) {

        $lang = 'la';

        $request = (new \GuzzleHttp\Psr7\ServerRequest('POST', ''));
        $inputResp = new \Slim\Http\Response();

        $response1 = self::$apiPresets->getAutomaticCollationPresets($request, $inputResp, null);
        $this->assertEquals(409, $response1->getStatusCode());


        // Bad witnesses
        $request2 = self::requestWithData($request,
            [   'userId' => 0,
                'lang' => $presetData['data']['lang'],
                'witnesses' => 'somestring'
            ]);

        $response2 = self::$apiPresets->getAutomaticCollationPresets($request2, $inputResp, null);

        $this->assertEquals(409, $response2->getStatusCode());
        $respData2 = json_decode($response2->getBody(true), true);
        $this->assertEquals(ApiPresets::API_ERROR_WRONG_TYPE, $respData2['error']);

        // not enough witnesses
        $request3 = self::requestWithData($request,
            [   'userId' => 0,
                'lang' => $presetData['data']['lang'],
                'witnesses' => [1]
            ]);
        $response3 = self::$apiPresets->getAutomaticCollationPresets($request3, $inputResp, null);

        $this->assertEquals(409, $response3->getStatusCode());
        $respData3 = json_decode($response3->getBody(true), true);
        $this->assertEquals(ApiPresets::API_ERROR_NOT_ENOUGH_WITNESSES, $respData3['error']);

        $witnessesToMatch = $presetData['data']['witnesses'];
        $request4 = self::requestWithData($request,
            [   'userId' => 0,
                'lang' => $presetData['data']['lang'],
                'witnesses' => $witnessesToMatch
            ]);
        $response4 = self::$apiPresets->getAutomaticCollationPresets($request4, $inputResp, null);

        $this->assertEquals(200, $response4->getStatusCode());
        $respData4 = json_decode($response4->getBody(true), true);
        $this->assertCount(1, $respData4['presets']);
        $this->assertEquals($presetData['id'], $respData4['presets'][0]['presetId']);

        // same, but with userId
        $request5 = self::requestWithData($request,
            [   'userId' => $presetData['userId'],
                'lang' => $presetData['data']['lang'],
                'witnesses' => $witnessesToMatch
            ]);
        $response5 = self::$apiPresets->getAutomaticCollationPresets($request5, $inputResp, null);

        $this->assertEquals(200, $response5->getStatusCode());
        $respData5 = json_decode($response5->getBody(true), true);
        $this->assertCount(1, $respData5['presets']);
        $this->assertEquals($presetData['id'], $respData5['presets'][0]['presetId']);

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
