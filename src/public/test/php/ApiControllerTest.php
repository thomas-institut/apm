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
require  "autoload.php";
require_once 'SiteMockup/DatabaseTestEnvironment.php';
require_once 'SiteMockup/testconfig.php';


use APM\Presets\PresetManager;
use APM\System\ApmConfigParameter;
use APM\System\ApmContainerKey;
use APM\System\SystemManager;
use APM\System\WitnessType;
use AverroesProject\EditorialNote;
use AverroesProject\TxText\Item;
use Cassandra\Time;
use DI\DependencyException;
use DI\NotFoundException;
use Exception;
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Psr7;

use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\Text;
use AverroesProject\ColumnElement\Line;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Element;

use APM\Api\ApiController;
use APM\Api\ApiCollation;
use APM\Api\ApiPresets;
use APM\Api\ApiDocuments;
use APM\Api\ApiElements;

use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;
use GuzzleHttp\Psr7\ServerRequest;
use DI\Container;
use ThomasInstitut\TimeString\TimeString;
use function GuzzleHttp\Psr7\stream_for;


/**
 * API call tests
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApiControllerTest extends TestCase {
    
    
    static $testEnvironment;

    /**
     * @var Container
     */
    static $container;
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
    /**
     * @var ApiDocuments
     */
    static $apiDocuments;
    /**
     * @var ApiElements
     */
    static $apiElements;


    /**
     * @var LoggerInterface
     */
    private static $logger;

    /**
     * @throws DependencyException
     * @throws NotFoundException
     * @throws Exception
     */
    public static function setUpBeforeClass() : void
    {
        global $apmTestConfig;
        
       
        self::$testEnvironment = new DatabaseTestEnvironment($apmTestConfig);
        self::$container = self::$testEnvironment->getContainer();
        /** @var SystemManager $systemManager */
        $systemManager = self::$container->get(ApmContainerKey::SYSTEM_MANAGER);

        self::$logger = $systemManager->getLogger();


        self::$logger->debug('Setting up before class');


        self::$dataManager = self::$container->get(ApmContainerKey::DATA_MANAGER);

        $apiUser = self::$dataManager->userManager->createUserByUserName('testApiUser');
        self::$testEnvironment->setApiUser($apiUser);
        self::$testEnvironment->setUserId($apiUser);

        // API controllers to test
        self::$apiCollation = new ApiCollation(self::$container);
        self::$apiPresets = new ApiPresets(self::$container);
        self::$apiDocuments = new ApiDocuments(self::$container);
        self::$apiElements = new ApiElements(self::$container);
    }

    private function debug($msg, $data = []) {
        self::$logger->debug($msg, $data);
    }

    public function testQuickCollation()
    {
        self::$testEnvironment->emptyDatabase();
        self::$editor1 = self::$dataManager->userManager->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->userManager->createUserByUserName('testeditor2');

        $this->debug('testQuickCollation');

        $request = new ServerRequest('POST', '');

        // No data
        $response = self::$apiCollation->quickCollation($request, new Response() );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(ApiController::API_ERROR_NO_DATA, $respData['error']);
     
        // No witnesses
        $response = self::$apiCollation->quickCollation(
            self::requestWithData($request, [
                'somekey' => 'somevalue1'
            ]),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());

        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(ApiController::API_ERROR_MISSING_REQUIRED_FIELD, $respData['error']);

        // Less than two witnesses
        $response = self::$apiCollation->quickCollation(
            self::requestWithData($request, [
                'witnesses' => []
            ]),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(200, $response->getStatusCode());
        
    }
    


    /**
     * @return mixed
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function testGetPresets() {

        $lang = 'la';

        self::$testEnvironment->emptyDatabase();
        self::$editor1 = self::$dataManager->userManager->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->userManager->createUserByUserName('testeditor2');
        $request = (new ServerRequest('POST', ''));


        $response1 = self::$apiPresets->getPresets($request, new Response());

        $this->assertEquals(409, $response1->getStatusCode());

        // Empty tool
        $request2 = self::requestWithData($request,
            ['tool' => '',
                'userId' => self::$editor1,
                'keyArrayToMatch' => []]);

        $response2 = self::$apiPresets->getPresets($request2, new Response());

        $this->assertEquals(409, $response2->getStatusCode());
        $respData2 = json_decode($response2->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_WRONG_TYPE, $respData2['error']);

        // Invalid tool
        $request3 = self::requestWithData($request,
            ['tool' => 'sometool',
                'userId' => self::$editor1,
                'keyArrayToMatch' => []]);

        $response3 = self::$apiPresets->getPresets($request3, new Response());

        $this->assertEquals(409, $response3->getStatusCode());
        $respData3 = json_decode($response3->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_UNRECOGNIZED_TOOL, $respData3['error']);

        // Invalid keyArraytoMatch
        $request4 = self::requestWithData($request,
            ['tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => self::$editor1,
                'keyArrayToMatch' => 'not an array']);

        $response4 = self::$apiPresets->getPresets($request4, new Response());

        $this->assertEquals(409, $response4->getStatusCode());
        $respData4 = json_decode($response4->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_WRONG_TYPE, $respData4['error']);

        // No presets returned
        $request5 = self::requestWithData($request,
            ['tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => self::$editor1,
                'keyArrayToMatch' => []]);

        $response5 = self::$apiPresets->getPresets($request5, new Response());

        $this->assertEquals(200, $response5->getStatusCode());
        $respData5 = json_decode($response5->getBody(), true);
        $this->assertEquals([], $respData5['presets']);

        // Get some presets in
        /** @var PresetManager $presetManager */
        $presetManager = self::$container->get(ApmContainerKey::SYSTEM_MANAGER)->getPresetsManager();
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
        $response6 = self::$apiPresets->getPresets($request6, new Response());
        $this->assertEquals(200, $response6->getStatusCode());
        $respData6 = json_decode($response6->getBody(), true);
        $this->assertCount(1, $respData6['presets']);

        $this->assertEquals(self::$editor1, $respData6['presets'][0]['userId']);
        $this->assertEquals($lang, $respData6['presets'][0]['data']['lang']);
        $this->assertEquals($witnesses, $respData6['presets'][0]['data']['witnesses']);

        //try again without userId
        $request7 = self::requestWithData($request,
            ['tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => false,
                'keyArrayToMatch' => []]);
        $response7 = self::$apiPresets->getPresets($request7, new Response());
        $this->assertEquals(200, $response7->getStatusCode());
        $respData7 = json_decode($response7->getBody(), true);
        $this->assertCount(1, $respData7['presets']);

        $this->assertEquals(self::$editor1, $respData7['presets'][0]['userId']);
        $this->assertEquals($lang, $respData7['presets'][0]['data']['lang']);
        $this->assertEquals($witnesses, $respData7['presets'][0]['data']['witnesses']);

        return $respData7['presets'][0];
    }

    /**
     * @depends testGetPresets
     * @param array $presetData
     */
    public function testGetAutomaticCollationPresets(array $presetData) {

        $request = (new ServerRequest('POST', ''));

        $response1 = self::$apiPresets->getAutomaticCollationPresets($request, new Response());
        $this->assertEquals(409, $response1->getStatusCode());


        // Bad witnesses
        $request2 = self::requestWithData($request,
            [   'userId' => 0,
                'lang' => $presetData['data']['lang'],
                'witnesses' => 'somestring'
            ]);

        $response2 = self::$apiPresets->getAutomaticCollationPresets($request2, new Response());

        $this->assertEquals(409, $response2->getStatusCode());
        $respData2 = json_decode($response2->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_WRONG_TYPE, $respData2['error']);

        // not enough witnesses
        $request3 = self::requestWithData($request,
            [   'userId' => 0,
                'lang' => $presetData['data']['lang'],
                'witnesses' => [1]
            ]);
        $response3 = self::$apiPresets->getAutomaticCollationPresets($request3, new Response());

        $this->assertEquals(409, $response3->getStatusCode());
        $respData3 = json_decode($response3->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_NOT_ENOUGH_WITNESSES, $respData3['error']);

        $witnessesToMatch = $presetData['data']['witnesses'];
        $request4 = self::requestWithData($request,
            [   'userId' => 0,
                'lang' => $presetData['data']['lang'],
                'witnesses' => $witnessesToMatch
            ]);
        $response4 = self::$apiPresets->getAutomaticCollationPresets($request4, new Response());

        $this->assertEquals(200, $response4->getStatusCode());
        $respData4 = json_decode($response4->getBody(), true);
        $this->assertCount(1, $respData4['presets']);
        $this->assertEquals($presetData['id'], $respData4['presets'][0]['presetId']);

        // same, but with userId
        $request5 = self::requestWithData($request,
            [   'userId' => $presetData['userId'],
                'lang' => $presetData['data']['lang'],
                'witnesses' => $witnessesToMatch
            ]);
        $response5 = self::$apiPresets->getAutomaticCollationPresets($request5, new Response());

        $this->assertEquals(200, $response5->getStatusCode());
        $respData5 = json_decode($response5->getBody(), true);
        $this->assertCount(1, $respData5['presets']);
        $this->assertEquals($presetData['id'], $respData5['presets'][0]['presetId']);

    }

    /**
     * @depends testGetPresets
     * @param $presetInfo
     * @return array
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function testSavePreset($presetInfo) {
        $request = (new ServerRequest('POST', ''));


        $response1 = self::$apiPresets->savePreset($request, new Response());
        $this->assertEquals(409, $response1->getStatusCode());

        //$lang = $presetInfo['data']['lang'];
        $presetUserId = $presetInfo['userId'];
        $presetId = $presetInfo['id'];
        $presetTitle = $presetInfo['title'];
        $presetData = $presetInfo['data'];

        // bad command
        $request2 = self::requestWithData($request,
            [   'command' => ApiPresets::COMMAND_UPDATE .  'spurioussuffix',
                'tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => $presetUserId,
                'title' => 'new title',
                'presetId' => $presetId,
                'presetData' => $presetData
            ]);
        $response2 = self::$apiPresets->savePreset($request2, new Response());
        $this->assertEquals(409, $response2->getStatusCode());
        $respData2 = json_decode($response2->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_UNKNOWN_COMMAND, $respData2['error']);

        // bad tool
        $request3 = self::requestWithData($request,
            [   'command' => ApiPresets::COMMAND_UPDATE,
                'tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION . 'spurioussuffix',
                'userId' => $presetUserId,
                'title' => 'new title',
                'presetId' => $presetId,
                'presetData' => $presetData
            ]);
        $response3 = self::$apiPresets->savePreset($request3, new Response());
        $this->assertEquals(409, $response3->getStatusCode());
        $respData3 = json_decode($response3->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_UNRECOGNIZED_TOOL, $respData3['error']);
        
        // invalid preset data
        $request4 = self::requestWithData($request,
            [   'command' => ApiPresets::COMMAND_UPDATE,
                'tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => $presetUserId,
                'title' => 'new title',
                'presetId' => $presetId,
                'presetData' => []
            ]);
        $response4 = self::$apiPresets->savePreset($request4, new Response());
        $this->assertEquals(409, $response4->getStatusCode());
        $respData4 = json_decode($response4->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_INVALID_PRESET_DATA, $respData4['error']);
        
        // successful new preset
        $apiUser = self::$dataManager->userManager->createUserByUserName('testApiUser2');
        $this->assertNotFalse($apiUser);
        self::$testEnvironment->setUserId($apiUser);
        $presetOwnedByNewApiUser = $presetData;
        $presetOwnedByNewApiUser['userId'] = $apiUser;

        $request5 = self::requestWithData($request,
            [   'command' => ApiPresets::COMMAND_NEW,
                'tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => 0, // this will be ignored by the API, what matter is the user in presetData
                'title' => $presetTitle,
                'presetId' => 0,
                'presetData' => $presetOwnedByNewApiUser
            ]);
        $response5 = self::$apiPresets->savePreset($request5, new Response());
        $respData5 = json_decode($response5->getBody(), true);
        $this->assertEquals(200, $response5->getStatusCode());

        $newPresetId = $respData5['presetId'];
        $this->assertNotEquals($presetId, $newPresetId);

        // new preset attempt on existing preset
        $request6 = self::requestWithData($request,
            [   'command' => ApiPresets::COMMAND_NEW,
                'tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => self::$container->get(ApmContainerKey::USER_ID),
                'title' => $presetTitle,
                'presetId' => 0,
                'presetData' => $presetOwnedByNewApiUser
            ]);
        $response6 = self::$apiPresets->savePreset($request6, new Response());
        $this->assertEquals(409, $response6->getStatusCode());
        $respData6 = json_decode($response6->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_PRESET_ALREADY_EXISTS, $respData6['error']);

        
        // update attempt, API user not authorized
        $request7 = self::requestWithData($request,
            [   'command' => ApiPresets::COMMAND_UPDATE,
                'tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => 0, // ignored by API on updates
                'title' => $presetTitle . '_new',
                'presetId' => $presetId,
                'presetData' => $presetData
            ]);
        $response7 = self::$apiPresets->savePreset($request7, new Response());
        $this->assertEquals(409, $response7->getStatusCode());
        $respData7 = json_decode($response7->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_NOT_AUTHORIZED, $respData7['error']);
        
        // update attempt on non-existent preset
        $request8 = self::requestWithData($request,
            [   'command' => ApiPresets::COMMAND_UPDATE,
                'tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => 0, // ignored by API on updates
                'title' => $presetTitle . '_new',
                'presetId' => $presetId + 2000,
                'presetData' => $presetData
            ]);
        $response8 = self::$apiPresets->savePreset($request8, new Response());
        $this->assertEquals(409, $response8->getStatusCode());
        $respData8 = json_decode($response8->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_PRESET_DOES_NOT_EXIST, $respData8['error']);
    
        // succesful update attempt
        $request9 = self::requestWithData($request,
            [   'command' => ApiPresets::COMMAND_UPDATE,
                'tool' => System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION,
                'userId' => 0, // ignored by API on updates
                'title' => $presetTitle . '_new',
                'presetId' => $newPresetId,
                'presetData' => $presetOwnedByNewApiUser
            ]);
        $response9 = self::$apiPresets->savePreset($request9, new Response());
        $this->assertEquals(200, $response9->getStatusCode());
        $respData9 =  json_decode($response9->getBody(), true);
        $this->assertEquals($newPresetId, $respData9['presetId']);

        return [ 'presetId1' => $presetId, 'presetId2' => $newPresetId, 'apiUserId' => $apiUser] ;
    }

    /**
     * @depends testSavePreset
     * @param $presetData
     */
    public function testDeletePreset($presetData) {
        self::$testEnvironment->setUserId($presetData['apiUserId']);
        $presetId1 = $presetData['presetId1']; // owned by self::$editor1
        $presetId2 = $presetData['presetId2']; // owned by the current api user

        // delete attempt with non-existent preset
        $request = (new ServerRequest('GET', ''))
            ->withAttribute('id', $presetId2 + 1000);


        $response1 = self::$apiPresets->deletePreset($request, new Response());
        $this->assertEquals(409, $response1->getStatusCode());
        $respData1 = json_decode($response1->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_PRESET_DOES_NOT_EXIST, $respData1['error']);
        
        // delete attempt on preset by another user
        $request2 = (new ServerRequest('GET', ''))
            ->withAttribute('id', $presetId1);


        $response2 = self::$apiPresets->deletePreset($request2, new Response());
        $this->assertEquals(409, $response2->getStatusCode());
        $respData2 = json_decode($response2->getBody(), true);
        $this->assertEquals(ApiPresets::API_ERROR_NOT_AUTHORIZED, $respData2['error']);
        
        // successful delete attempt
        $request3 = (new ServerRequest('GET', ''))
            ->withAttribute('id', $presetId2);

        $response3 = self::$apiPresets->deletePreset($request3, new Response());
        $this->assertEquals(200, $response3->getStatusCode());
    }
    
    public static function requestWithData(ServerRequest $request, $data) : ServerRequest {
        return $request->withBody(
            stream_for(
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
            ItemArray::addItem($element->items, new ChunkMark($itemId++, $itemSeq++, $work, $chunk, 'start', 'A', 1));
            ItemArray::addItem($element->items, new Text($itemId++,$itemSeq++,"The text of the chunk, witness " . $witnessNumber));
            ItemArray::addItem($element->items, new ChunkMark($itemId++, $itemSeq++, $work, $chunk, 'end', 'A',1));
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
            ItemArray::addItem($element->items, new ChunkMark($itemId++, $itemSeq++, $work, $chunk, 'start', 'A',1));
            ItemArray::addItem($element->items, new Text($itemId++,$itemSeq++,"The text of the chunk, (bad) witness " . $witnessNumber));  
            $dm->insertNewElement($element);
            $witnessNumber++;
            $docIds[] = $docId;
        }
        
        return $docIds;
        
    }


    public function testNumColumns()
    {
        $request = (new ServerRequest('GET', ''))
            ->withAttribute('document', 100)
            ->withAttribute('page', 1);

        $response = self::$apiDocuments->getNumColumns($request, new Response());

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertEquals(0, $data);
    }



    public function testGetElements()
    {

        self::$testEnvironment->emptyDatabase();

        // test on a non-existent page
        $request = (new ServerRequest('GET', ''))
            ->withAttribute('document', 1)
            ->withAttribute('page', 1)
            ->withAttribute('column', 1);


        $response = self::$apiElements->getElementsByDocPageCol($request,  new Response());

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertEquals([], $data['elements']);
        $this->assertEquals([], $data['ednotes']);
        $this->assertEquals([self::$container->get(ApmContainerKey::USER_ID)], array_keys($data['people'])); // only test UserId
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
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editor;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text(0,-1,"Original Line ". (string)($i+1)));
            $elementIds[] = $dm->insertNewElement($element)->id;
        }
        $elementsInDb = $dm->getColumnElementsByPageId($pageId, 1);

        $request2 = (new ServerRequest('GET', ''))
            ->withAttribute('document', $docId)
            ->withAttribute('page', 1)
            ->withAttribute('column', 1);


        $response2 = self::$apiElements->getElementsByDocPageCol($request,
            new Response());

        $this->assertEquals(200, $response2->getStatusCode());
        $data2 = json_decode($response2->getBody(), true);

        $this->assertCount($numElements, $data2['elements']);
        $this->assertEquals([], $data['ednotes']);

        foreach ($data2['elements'] as $ele) {
            $this->assertEquals(Element::LINE, $ele['type']);
            $this->assertEquals($pageId, $ele['pageId']);
            $this->assertEquals(1, $ele['columnNumber']);
            $this->assertEquals($editor, $ele['editorId']);
            $this->assertEquals('la', $ele['lang']);
            $this->assertEquals(0, $ele['handId']);
            $this->assertCount(1, $ele['items']);
        }

        return $docId;
    }

    /**
     * @depends testGetElements
     */
    public function testUpdateColumnElements()
    {

        self::$editor1 = self::$dataManager->userManager->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->userManager->createUserByUserName('testeditor2');


        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test API Doc 2', 'TA-2', $numPages, 'la',
            'mss', 'local', 'TESTELEM');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }

        $pageId =  $dm->getPageIdByDocPage($docId, 1);

        $request = (new ServerRequest('POST', ''))
            ->withAttribute('document', $docId)
            ->withAttribute('page', 1)
            ->withAttribute('column', 1);


        // TEST 1: nothing in request contents
        $response = self::$apiElements->updateElementsByDocPageCol(
            $request,
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_DATA, $respData['error']);


        // TEST 2: unstructured data in request contents
        $response = self::$apiElements->updateElementsByDocPageCol(
            $request->withBody(stream_for('Some data')),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_DATA, $respData['error']);

        // TEST 3: wrong POST field
        $queryString = http_build_query([ 'somefield' => 'some data'], '', '&');
        $response = self::$apiElements->updateElementsByDocPageCol(
            $request->withBody(stream_for($queryString)),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_DATA, $respData['error']);

        // TEST 4: empty data
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, []),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_ELEMENT_ARRAY, $respData['error']);

        // TEST 4: wrong data fields
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, ['somefield' => 'somedata']),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_ELEMENT_ARRAY, $respData['error']);

        // TEST 5: no ednotes
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                'elements' => [
                    ['id' => 100, 'type' => 1]
                ]
            ]),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(Api\ApiController::API_ERROR_NO_EDNOTES, $respData['error']);

        // TEST 6: zero elements
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                'elements' => [],
                'ednotes' => []
            ]),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
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
                new Response()
            );
            $this->assertEquals(409, $response->getStatusCode());
            $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
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
                new Response()
            );
            $this->assertEquals(409, $response->getStatusCode());
            $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(Api\ApiController::API_ERROR_DUPLICATE_ITEM_ID, $respData['error']);

        // FINALLY do it!
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ],
                'ednotes' => []
            ]),
            new Response()
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
            new Response()
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
                new Response()
            );
            $this->assertEquals(409, $response->getStatusCode());
            $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
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
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(Api\ApiController::API_ERROR_WRONG_AUTHOR_ID, $respData['error']);

        // TEST: Add an ednote
        $response = self::$apiElements->updateElementsByDocPageCol(
            self::requestWithData($request, [
                'elements' => [
                    $goodElement
                ],
                'ednotes' => [ $goodEditorialNote ]
            ]),
            new Response()
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
            new Response()
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
            new Response()
        );
        $this->assertEquals(200, $response->getStatusCode());
        $edNotesInDb = $dm->edNoteManager->getEditorialNotesByDocPageCol($docId, 1, 1);
        $this->assertCount(2, $edNotesInDb);
        $this->assertEquals($goodEditorialNote['authorId'], $edNotesInDb[0]->authorId);
        $this->assertEquals($goodEditorialNote['text'], $edNotesInDb[0]->text);
        $this->assertEquals($goodEditorialNote2['authorId'], $edNotesInDb[1]->authorId);
        $this->assertEquals($goodEditorialNote2['text'], $edNotesInDb[1]->text);
    }

}
