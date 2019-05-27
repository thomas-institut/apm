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
require_once 'SiteMockup/SiteTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use GuzzleHttp\Psr7\ServerRequest;


/**
 * Description of TestAuthenticator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SiteControllerTest extends TestCase {
     static $ci;
    
    public static function setUpBeforeClass()
    {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('SITETEST');
        $logger->pushHandler($logStream);

        self::$ci = SiteTestEnvironment::getContainer($logger);
    }
    
    public function testDocumentsPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        
        $sc = new Site\SiteDocuments(self::$ci);
        
        $response = $sc->documentsPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    public function testHomePage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        
        $sc = new Site\SiteHomePage(self::$ci);
        $response = $sc->homePage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(302, $response->getStatusCode());
    }
    
    public function testDashboardPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100, 'username' => 'testUser'];
         
        $sc = new Site\SiteDashboard(self::$ci);
        
        $response =$sc->dashboardPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    public function testChunksPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        $sc = new Site\SiteChunks(self::$ci);
        
        $response = $sc->chunksPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    public function testUserManagerPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        
        $sc = new Site\SiteUserManager(self::$ci);
        
        $response =$sc->userManagerPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    
}
