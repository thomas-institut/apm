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
    
    public static function setUpBeforeClass()
    {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('APITEST');
        $logger->pushHandler($logStream);

        self::$ci = DatabaseTestEnvironment::getContainer($logger);
        DatabaseTestEnvironment::emptyDatabase();
        self::$apiController = new Api\ApiController(self::$ci);
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
        $this->assertEquals([], $data['people']);
        $this->assertEquals(['col' => 1], $data['info']);
        
    }
}
