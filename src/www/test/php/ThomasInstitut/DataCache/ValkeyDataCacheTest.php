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

namespace ThomasInstitut\Test\DataCache;

use Exception;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use ThomasInstitut\DataCache\Reference\DataCacheReferenceTest;
use ThomasInstitut\ValkeyDataCache\ValkeyDataCache;


class ValkeyDataCacheTest extends TestCase
{

    /**
     * @throws Exception
     */
    public function testStandardTests() {

        $tester = new DataCacheReferenceTest('Valkey');

        $config = yaml_parse_file(__DIR__ . '/valkey.config.yaml');
        if ($config === false) {
            throw new Exception('Error parsing config file');
        }

        $host = $config['host'] ?? 'localhost';
        $port = $config['port'] ?? 6379;

        $prefix = "test_" . rand(1000000, 9999990) . ':';
        $valkeyClient = new Client(['host' => $host, 'port' => $port]);

        $tester->runAllTests(new ValkeyDataCache($prefix, $valkeyClient), 'ValkeyDataCache');
    }

}