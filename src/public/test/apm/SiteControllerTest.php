<?php

/*
 * Copyright (C) 2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace APM;
require "../vendor/autoload.php";
require_once 'SiteMockup/SiteTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use GuzzleHttp\Psr7\ServerRequest;

use APM\Site\SiteCollationTable;


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
    
    public function testQuickCollationPage()
    {
        
        $request = new ServerRequest('GET', '');
        $inputResp = new \Slim\Http\Response();
        self::$ci['userInfo'] = ['id' => 100];
        
        $sc = new SiteCollationTable(self::$ci);
        
        $response = $sc->quickCollationPage($request, $inputResp, 
                NULL);
        
        $this->assertEquals(200, $response->getStatusCode());
    }
    
}
