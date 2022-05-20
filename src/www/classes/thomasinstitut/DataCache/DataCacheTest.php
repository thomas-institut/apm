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

namespace ThomasInstitut\DataCache;


use Exception;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\TimeString\TimeString;


/**
 * Class DataCacheTest
 *
 * Reference tests for any implementation of a DataCache
 *
 * @package ThomasInstitut\DataCache
 */
class DataCacheTest extends TestCase
{

    const NUM_KEYS_TO_TEST = 100;
    const READ_ITERATIONS = 500;

    /**
     * @var DataCache
     */
    private $dataCache;
    /**
     * @var string
     */
    private $testClassName;
    /**
     * @var string
     */
    private $keyPrefix;

    /**
     * @param DataCache $dc
     * @param string $testClassName
     * @throws Exception
     */
    protected function setDataCache(DataCache $dc, string $testClassName) {
        $this->dataCache = $dc;
        $this->testClassName = $testClassName;
        $this->keyPrefix = 'DataCacheTest:' . $testClassName . ':' . TimeString::compactEncode(TimeString::now()) . ':' . random_int(1,1000) . ':';
    }

    /**
     * @param DataCache $dc
     * @param string $testClassName
     * @throws KeyNotInCacheException
     * @throws Exception
     */
    public function runAllTests(DataCache $dc, string $testClassName){
        $this->setDataCache($dc, $testClassName);
        $this->basicTest();
    }

    /**
     * @throws KeyNotInCacheException
     * @throws Exception
     */
    public function basicTest() {

        // try to get a value for a non-existent key
        $exceptionCaught= false;
        try {
            $this->dataCache->get($this->keyPrefix . 'somekey');
        } catch (KeyNotInCacheException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $this->testClassName);

        // try to delete a non-existent key
        $exceptionCaught= false;
        try {
            $this->dataCache->delete($this->keyPrefix . 'somekey');
        } catch (KeyNotInCacheException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        // build the test set
        $valuesTestSet = [];
        for($i = 0; $i < self::NUM_KEYS_TO_TEST; $i++) {
            $valuesTestSet[] = [
                'key' => $this->keyPrefix . 'testSet1-' . $i . '-' . random_int(1,10000),
                'value' => 'value-' . random_int(1, 1000000)
            ];
        }

        // fill the cache
        foreach($valuesTestSet as $testCase) {
            $this->dataCache->set($testCase['key'], $testCase['value']);
        }

        // read the cache randomly
        for($i = 0; $i < self::READ_ITERATIONS; $i++){
            $testCase = $valuesTestSet[random_int(0, self::NUM_KEYS_TO_TEST-1)];
            $cachedValue = $this->dataCache->get($testCase['key']);
            $this->assertEquals($testCase['value'], $cachedValue, $this->testClassName . ", cache read, iteration $i");
        }

        //prepare new values
        $newValuesTestSet = [];
        for($i = 0; $i < self::NUM_KEYS_TO_TEST; $i++) {
            $newValuesTestSet[] = [
                'key' => $valuesTestSet[$i]['key'],
                'value' => 'newvalue-' . random_int(1, 1000000)
            ];
        }

        // rewrite keys with new values
        foreach($newValuesTestSet as $testCase) {
            $this->dataCache->set($testCase['key'], $testCase['value']);
        }

        // read the cache randomly
        for($i = 0; $i < self::READ_ITERATIONS; $i++){
            $testCase = $newValuesTestSet[random_int(0, self::NUM_KEYS_TO_TEST-1)];
            $cachedValue = $this->dataCache->get($testCase['key']);
            $this->assertEquals($testCase['value'], $cachedValue, $this->testClassName . ", cache read, iteration $i");
        }

        // delete the cache
        foreach($valuesTestSet as $testCase) {
            $this->dataCache->delete($testCase['key']);
        }

        // read the cache randomly again
        for($i = 0; $i < self::READ_ITERATIONS; $i++){
            $testCase = $valuesTestSet[random_int(0, self::NUM_KEYS_TO_TEST-1)];
            $exceptionCaught = false;
            try {
                $cachedValue = $this->dataCache->get($testCase['key']);
            } catch(KeyNotInCacheException $e) {
                $exceptionCaught = true;
            }
            $this->assertTrue($exceptionCaught, $this->testClassName . ", cache read after delete, iteration $i");
        }
    }

}