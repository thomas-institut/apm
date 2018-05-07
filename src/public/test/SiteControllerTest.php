<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
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
