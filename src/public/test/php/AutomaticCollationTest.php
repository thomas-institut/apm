<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

use APM\Api\ApiCollation;
use APM\Api\ApiController;
use APM\Api\ApiDocuments;
use APM\Api\ApiElements;
use APM\Api\ApiPresets;
use APM\System\ApmContainerKey;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use AverroesProject\ColumnElement\Line;
use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\ItemArray;
use AverroesProject\TxText\Text;
use DI\Container;
use DI\DependencyException;
use DI\NotFoundException;
use Exception;
use GuzzleHttp\Psr7\ServerRequest;
use Monolog\Logger;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;
use ThomasInstitut\TimeString\TimeString;
use function GuzzleHttp\Psr7\stream_for;

class AutomaticCollationTest extends TestCase
{


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

        /** @var Logger $containerLogger */
        $containerLogger = self::$container->get(ApmContainerKey::LOGGER);
        self::$logger = $containerLogger->withName('TEST');

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


    /**
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function testAutomaticCollation() {

        $this->debug('TestAutomaticCollation');
        $work = 'AW47';
        $chunk = 25;
        $lang = 'la';
        $otherLang = 'he';
        $numGoodWitnesses = 5;
        $numBadWitnesses = 2;
        $timeStringNow = TimeString::now();
        $compactTimeStringNow = TimeString::compactEncode($timeStringNow);

        self::$testEnvironment->emptyDatabase();
        self::$editor1 = self::$dataManager->userManager->createUserByUserName('testeditor1');
        self::$editor2 = self::$dataManager->userManager->createUserByUserName('testeditor2');

        $request = (new ServerRequest('POST', ''));


        // No data
        $response = self::$apiCollation->automaticCollation(
            $request,
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(ApiController::API_ERROR_NO_DATA, $respData['error']);

        // No valid fields in data
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'somekey' => 'somevalue'
            ]),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(ApiController::API_ERROR_MISSING_REQUIRED_FIELD, $respData['error']);

        // Less than two witnesses in partial collation
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => $lang,
                'witnesses' => [
                    [ 'type' => WitnessType::FULL_TRANSCRIPTION,  'systemId' => "$work-$chunk-1-A-" . $compactTimeStringNow ]
                ]
            ]),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(ApiCollation::ERROR_NOT_ENOUGH_WITNESSES, $respData['error']);


        // Invalid language
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => 'tagalog',
                'witnesses' => []  // i.e., collate ALL witnesses
            ]),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(ApiCollation::ERROR_INVALID_LANGUAGE, $respData['error']);

        // Less than two witnesses in the database
//        $response = self::$apiCollation->automaticCollation(
//            self::requestWithData($request, [
//                'work' => $work,
//                'chunk' => $chunk,
//                'lang' => $lang,
//                'witnesses' => []  // i.e., collate ALL witnesses
//            ]),
//            new Response()
//        );
//        $this->assertEquals(409, $response->getStatusCode());
//        $respData = json_decode($response->getBody(), true);
//        $this->assertEquals(ApiCollation::ERROR_NOT_ENOUGH_WITNESSES, $respData['error']);


        $docIds1= $this->createWitnessesInDb($work, $chunk, $lang, self::$editor1, $numGoodWitnesses, $numBadWitnesses);
        $docIds2 = $this->createWitnessesInDb($work, $chunk, $otherLang, self::$editor1, $numGoodWitnesses, $numBadWitnesses);
        $docIds = array_merge($docIds1, $docIds2);

        $this->debug('Doc Ids', $docIds);

        $timeStringNow = TimeString::now();
        $compactTimeStringNow = TimeString::compactEncode($timeStringNow);

        $systemId1 = WitnessSystemId::buildFullTxId($work, $chunk, $docIds1[0],'A', $timeStringNow);
        $systemId2 = WitnessSystemId::buildFullTxId($work, $chunk, $docIds1[1],'A', $timeStringNow);

        // This one should work!
        $this->debug('Good collation');
        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request, [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => $lang,
                'witnesses' => [
                    [ 'type' => WitnessType::FULL_TRANSCRIPTION,  'systemId' => $systemId1 , 'title' => 'Doc 1'],
                    [ 'type' => WitnessType::FULL_TRANSCRIPTION,  'systemId' => $systemId2, 'title' => 'Doc 2' ]
                ]
            ]),
            new Response()
        );

        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(200, $response->getStatusCode());


        $this->assertTrue(isset($respData['collationTable']));
        $this->assertTrue(isset($respData['sigla']));
        $this->assertTrue(isset($respData['collationEngineDetails']));

        // a partial collation with wrong doc ids
        $badDocId = max($docIds)+1;

        $response = self::$apiCollation->automaticCollation(
            self::requestWithData($request,
                [
                'work' => $work,
                'chunk' => $chunk,
                'lang' => $lang,
                'witnesses' => [
                    [
                        'type' =>  WitnessType::FULL_TRANSCRIPTION,
                        'systemId'=> WitnessSystemId::buildFullTxId($work, $chunk, $docIds[0],'A', $timeStringNow),
                        'title' => 'Good Doc'
                    ],
                    [
                        'type' =>  WitnessType::FULL_TRANSCRIPTION,
                        'systemId'=> WitnessSystemId::buildFullTxId($work, $chunk, $badDocId++,'A', $timeStringNow),
                        'title' => 'Bad Doc 1'
                    ],
                    [
                        'type' =>  WitnessType::FULL_TRANSCRIPTION,
                        'systemId'=> WitnessSystemId::buildFullTxId($work, $chunk, $badDocId,'A', $timeStringNow),
                        'title' => 'Bad Doc 2'
                    ]
                ]
                ]),
            new Response()
        );
        $this->assertEquals(409, $response->getStatusCode());
        $respData = json_decode($response->getBody(), true);
        $this->assertEquals(ApiCollation::ERROR_BAD_WITNESS, $respData['error']);
    }

    private function createWitnessesInDb($work, $chunk, $lang, $editor, $numGoodWitnesses, $numBadWitnesses) {

        $this->debug("Creating $numGoodWitnesses / $numBadWitnesses witnesses in DB for $work-$chunk, lang $lang, editor $editor");
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

    public static function requestWithData(ServerRequest $request, $data) : ServerRequest {
        return $request->withBody(
            stream_for(
                http_build_query(['data' => json_encode($data)])
            )
        );
    }

    private function debug($msg, $data = []) {
        self::$logger->debug($msg, $data);
    }

}