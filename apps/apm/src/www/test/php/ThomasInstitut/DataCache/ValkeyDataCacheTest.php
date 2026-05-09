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

    /**
     * @throws Exception
     */
    public function testFlushOnlyDeletesPrefixedKeys() {
        $config = yaml_parse_file(__DIR__ . '/valkey.config.yaml');
        if ($config === false) {
            throw new Exception('Error parsing config file');
        }

        $host = $config['host'] ?? 'localhost';
        $port = $config['port'] ?? 6379;

        $prefix = "test_prefix_" . rand(1000000, 9999990) . ':';
        $valkeyClient = new Client(['host' => $host, 'port' => $port]);

        $cache = new ValkeyDataCache($prefix, $valkeyClient);

        // Set a key with the prefix via the cache
        $cache->set('key1', 'value1');

        // Set a key WITHOUT the prefix directly via the client
        $otherKey = 'other_key_' . rand(1000000, 9999990);
        $valkeyClient->set($otherKey, 'other_value');

        $this->assertTrue($cache->isInCache('key1'));
        $this->assertEquals('other_value', $valkeyClient->get($otherKey));

        // Flush the cache
        $cache->flush();

        // The prefixed key should be gone
        $this->assertFalse($cache->isInCache('key1'));

        // The non-prefixed key should STILL BE THERE
        $this->assertEquals('other_value', $valkeyClient->get($otherKey), 'Key without prefix was deleted!');

        // Clean up
        $valkeyClient->del($otherKey);
    }

    /**
     * @throws Exception
     */
    public function testGetInfo() {
        $config = yaml_parse_file(__DIR__ . '/valkey.config.yaml');
        if ($config === false) {
            throw new Exception('Error parsing config file');
        }

        $host = $config['host'] ?? 'localhost';
        $port = $config['port'] ?? 6379;

        $prefix = "test_info_" . rand(1000000, 9999990) . ':';
        $valkeyClient = new Client(['host' => $host, 'port' => $port]);

        $cache = new ValkeyDataCache($prefix, $valkeyClient);
        $cache->flush();

        $info = $cache->getInfo();
        $this->assertEquals(0, $info->itemCount);
        $this->assertEquals(0, $info->memoryUsage);

        $cache->set('key1', 'value1');
        $cache->set('key2', 'value2');

        $info = $cache->getInfo();
        $this->assertEquals(2, $info->itemCount);
        $this->assertGreaterThan(0, $info->memoryUsage);
        // It should be much less than the whole Redis memory if there are other keys
        // But for now let's just check it's something reasonable
        $this->assertLessThan(1024 * 1024, $info->memoryUsage); // 2 small keys should be way less than 1MB

        // Set a huge key NOT in this prefix to increase total memory usage
        $valkeyClient->set('large_key', str_repeat('A', 1024 * 1024));

        $info = $cache->getInfo();
        $this->assertEquals(2, $info->itemCount);
        $this->assertLessThan(100000, $info->memoryUsage); // Still should only count prefixed keys

        $cache->flush();
        $info = $cache->getInfo();
        $this->assertEquals(0, $info->itemCount);
        $this->assertEquals(0, $info->memoryUsage);

        // Clean up
        $valkeyClient->del('large_key');
    }

}