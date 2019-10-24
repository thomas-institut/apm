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
require_once 'SiteMockup/testconfig.php';
require_once 'SiteMockup/SiteTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use GuzzleHttp\Psr7\ServerRequest;
use APM\System\Auth\Authenticator;
use Slim\Psr7\Response;


/**
 * Description of TestAuthenticator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class AuthenticatorTest extends TestCase {
     static $ci;
    /**
     *
     * @var Authenticator
     */
    static $authenticator;

    /**
     * @var SiteTestEnvironment
     */
    static $testEnvironment;

    
    public static function setUpBeforeClass() : void
    {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('APITEST');
        $logger->pushHandler($logStream);

        global $apmTestConfig;
        self::$testEnvironment = new SiteTestEnvironment($apmTestConfig);
        self::$ci = self::$testEnvironment->getContainer();
        self::$authenticator = new Authenticator(self::$ci);
    }
    
    public function testLogin()
    {
        $auth = self::$authenticator;
        
        $request = new ServerRequest('GET', '');
        $response = $auth->login($request,  new Response());

        $this->assertGoodResponse($response, Authenticator::LOGIN_PAGE_SIGNATURE);
    }
    
    
    public function testLogout()
    {
        $auth = self::$authenticator;
        
        $request = new ServerRequest('GET', '');
        $inputResp = new Response();
        
        $response = $auth->logout($request, $inputResp);

        $this->assertEquals(302, $response->getStatusCode());
        $this->assertEquals('', $response->getBody()->getContents());
    }

    public function assertGoodResponse(Response $response, string $signature = '') {
        $this->assertEquals(200, $response->getStatusCode());
        $response->getBody()->rewind();
        $contents = $response->getBody()->getContents();
        $this->assertNotEquals('', $contents);
        $this->assertStringContainsString($signature, $contents);
    }
}
