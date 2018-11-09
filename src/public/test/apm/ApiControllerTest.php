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
namespace APM;
require "../vendor/autoload.php";
require_once '../test/testdbconfig.php';
require_once 'SiteMockup/DatabaseTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use GuzzleHttp\Psr7;


use APM\Api\ApiController;
use APM\Api\ApiCollation;

/**
 * API call tests
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApiControllerTest extends TestCase {
    
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
        global $config; 
        
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('APITEST');
        $logger->pushHandler($logStream);
        $hm = new \AverroesProject\Plugin\HookManager();
        $cr = new \AverroesProject\Collatex\CollatexRunner(
            $config['collatex']['collatexJarFile'], 
            $config['collatex']['tmp'], 
            $config['collatex']['javaExecutable']
        );

        self::$ci = DatabaseTestEnvironment::getContainer($logger);
        self::$ci->cr = $cr;
        DatabaseTestEnvironment::emptyDatabase();
        
        self::$dataManager = DatabaseTestEnvironment::getDataManager($logger, $hm);
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
        $this->assertEquals(ApiCollation::ERROR_NO_WITNESSES, $respData['error']);
        
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
    
    public static function requestWithData($request, $data) {
        return $request->withBody(
            Psr7\stream_for(
                http_build_query(['data' => json_encode($data)])
            )
        );

    }
    
}
