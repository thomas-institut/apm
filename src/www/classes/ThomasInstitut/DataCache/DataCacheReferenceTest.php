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
class DataCacheReferenceTest extends TestCase
{
    /**
     * @var DataCache
     */
    private DataCache $dataCache;
    /**
     * @var string
     */
    private string $testClassName;
    /**
     * @var string
     */
    private string $keyPrefix;
    
    private int $numKeysToTest = 50;
    private int $numReadIterations = 5;


    /**
     * Sets the test parameters
     * @param int $numKeys
     * @param int $numIterations
     * @return void
     */
    public function setParameters(int $numKeys, int $numIterations) : void {
        $this->numKeysToTest = $numKeys;
        $this->numReadIterations = $numIterations;
    }

    /**
     * @param DataCache $dc
     * @param string $testClassName
     * @throws Exception
     */
    protected function setDataCache(DataCache $dc, string $testClassName) : void {
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
    public function runAllTests(DataCache $dc, string $testClassName) : void{
        $this->setDataCache($dc, $testClassName);
        $this->basicTest();
        $this->expirationTest();
    }

    /**
     * @throws Exception
     * @noinspection PhpRedundantCatchClauseInspection
     */
    public function basicTest() : void{

        // try to get a value for a non-existent key
        $exceptionCaught= false;
        try {
            $this->dataCache->get($this->keyPrefix . 'someKey');
        } catch (KeyNotInCacheException) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $this->testClassName);

        // try to delete a non-existent key
        $exceptionCaught= false;
        try {
            $this->dataCache->delete($this->keyPrefix . 'someKey');
        } catch (KeyNotInCacheException) {
            $exceptionCaught = true;
        }
        $this->assertFalse($exceptionCaught);

        // build the test set
        $valuesTestSet = $this->buildTestSet('basic', 'value', $this->numKeysToTest);

        // fill the cache
        foreach($valuesTestSet as $testCase) {
            $this->dataCache->set($testCase['key'], $testCase['value']);
        }

        $this->randomRead($valuesTestSet, $this->numKeysToTest);

        // New values
        $newValuesTestSet =$this->buildTestSet('basic', 'newValue', $this->numKeysToTest);
        foreach($newValuesTestSet as $testCase) {
            $this->dataCache->set($testCase['key'], $testCase['value']);
        }
        $this->randomRead($newValuesTestSet, $this->numKeysToTest);

        // empty cache
        $this->dataCache->flush();

        // read the cache randomly again
        for($i = 0; $i < $this->numReadIterations; $i++){
            $testCase = $valuesTestSet[random_int(0, $this->numKeysToTest-1)];
            $exceptionCaught = false;
            try {
                $this->dataCache->get($testCase['key']);
            } catch(KeyNotInCacheException) {
                $exceptionCaught = true;
            }
            $this->assertTrue($exceptionCaught, $this->testClassName . ", cache read after delete, iteration $i");
        }
    }

    public function expirationTest() : void {

        $ttl = 1;
        $waitTime = 2;

        $testSet = $this->buildTestSet('exp', 'value', $this->numKeysToTest);
        // fill the cache
        foreach($testSet as $testCase) {
            $this->dataCache->set($testCase['key'], $testCase['value'], $ttl);
        }

        sleep($waitTime);
        for($i = 0; $i < $this->numReadIterations; $i++){
            $testCase = $testSet[rand(0, $this->numKeysToTest-1)];
            $exceptionCaught = false;
            try {
                $this->dataCache->get($testCase['key']);
            } catch(KeyNotInCacheException) {
                $exceptionCaught = true;
            }
            $this->assertTrue($exceptionCaught, $this->testClassName . ", cache read after delete, iteration $i");
        }
    }



    protected function buildTestSet(string $keyPrefix, string $valuePrefix, int $numKeys) : array {
        $valuesTestSet = [];
        for($i = 0; $i < $numKeys; $i++) {
            $valuesTestSet[] = [
                'key' => $keyPrefix . '_' . $i . '_' . rand(1,10000),
                'value' => $valuePrefix . '_' . rand(1, 1000000)
            ];
        }
        return $valuesTestSet;
    }

    /**
     * @throws KeyNotInCacheException
     */
    protected function randomRead(array $valuesTestSet, $numKeys): void
    {
        // read the cache randomly
        for($i = 0; $i < $this->numReadIterations; $i++){
            $testCase = $valuesTestSet[rand(0, $numKeys-1)];
            $cachedValue = $this->dataCache->get($testCase['key']);
            $this->assertEquals($testCase['value'], $cachedValue, $this->testClassName . ", cache read, iteration $i");
        }
    }

}