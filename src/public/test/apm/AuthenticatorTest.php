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


/**
 * Description of TestAuthenticator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class AuthenticatorTest extends TestCase {
     static $ci;
    /**
     *
     * @var APM\System\Auth\Authenticator
     */
    static $authenticator;

    /**
     * @var SiteTestEnvironment
     */
    static $testEnvironment;

    
    public static function setUpBeforeClass()
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
        $inputResp = new \Slim\Http\Response();
        
        $response = $auth->login($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
    
    public function testLogout()
    {
        $auth = self::$authenticator;
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        
        $response = $auth->logout($request, $inputResp, 
                NULL);
        
        $this->assertEquals(302, $response->getStatusCode());
    }
}
