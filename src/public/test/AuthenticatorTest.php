<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
require "../vendor/autoload.php";
require_once 'SiteTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use GuzzleHttp\Psr7\ServerRequest;
use AverroesProject\Auth\Authenticator;


/**
 * Description of TestAuthenticator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class AuthenticatorTest extends TestCase {
     static $ci;
    /**
     *
     * @var Auth\Authenticator
     */
    static $authenticator;
    
    public static function setUpBeforeClass()
    {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('APITEST');
        $logger->pushHandler($logStream);

        self::$ci = SiteTestEnvironment::getContainer($logger);
        self::$authenticator = new Authenticator(self::$ci);
    }
    
    public function testLogin()
    {
        $auth = self::$authenticator;
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        
        $response = $auth->login($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    
    public function testLogut()
    {
        $auth = self::$authenticator;
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        
        $response = $auth->logout($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
}
