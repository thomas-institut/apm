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



namespace ThomasInstitut\DataStore;


use InvalidArgumentException;
use PHPUnit\Framework\TestCase;


/**
 * Class DataStoreTest
 *
 * Validation test for DataStore implementations.
 *
 * To run with phpunit, create a class that extends PHPUnit\Framework\TestCase
 * with a methods that sets up the DataStore implementation to test, calls
 * setDataStore and
 * For example:

    class MyDataStoreImplementationTest extends TestCase
    {
        public function testRunTests() {
            testObject = new DataStoreTest();
            $testObject->setDataStore(new MyDataStore(), 'MyDataStore');
            $testObject->doAllTests();
        }
    }
 *
 * @package ThomasInstitut
 */
class DataStoreTest extends TestCase
{

    /**
     * @var DataStore
     */
    private $dataStore;

    /**
     * @var string
     */
    private $testClassName;

    protected function setDataStore(DataStore $dataStore, string $testClassName) {
        $this->dataStore = $dataStore;
        $this->testClassName = $testClassName;
    }

    public function runAll(DataStore $dataStore, string $testClassName) {
        $this->setDataStore($dataStore, $testClassName);
        $this->testEmtpyDataStore();
        $this->testSetAndAdd();
        $this->testBadJson();
    }

    public function testEmtpyDataStore() {
        $dataStore = $this->dataStore;
        $someKeys = [];
        for ($i = 0; $i < 10; $i++) {
            $someKeys[] = 'key' . random_int(0, 10000);
        }
        foreach($someKeys as $index => $key) {
            $testTitle = $this->testClassName . " : Empty data store, iteration $index, key = '$key'";
            $this->assertNull($dataStore->getValue($key), $testTitle);
            $this->assertEquals(json_encode(null), $dataStore->getJson($key), $testTitle);
            $this->assertFalse($dataStore->keyExists($key), $testTitle);
        }
    }

    public function testSetAndAdd() {
        $dataStore = $this->dataStore;

        $testTitlePrefix = $this->testClassName . ' : Set/Add : ';

        $testCases = [
            [ 'title' => 'Integer', 'keyPostfix' => 'int', 'value' => 25],
            [ 'title' => 'Float', 'keyPostfix' => 'float', 'value' => 25.0],
            [ 'title' => 'Boolean', 'keyPostfix' => 'boolean', 'value' => true],
            [ 'title' => 'Null', 'keyPostfix' => 'nullvalue', 'value' => null],
            [ 'title' => 'String', 'keyPostfix' => 'simplestring', 'value' => 'some string'],
            [ 'title' => 'Numerical Index Array', 'keyPostfix' => 'array', 'value' => [ 43.0, 54, [], 'some string', null, true]],
            [ 'title' => 'Associative Array', 'keyPostfix' => 'array2', 'value' => [ 'property1' => 0, 'property2' => 'somestring']]
        ];

        foreach($testCases as $testCase) {
            $testTitle = $testTitlePrefix . $testCase['title'];
            $key = 'testSetAndAdd:' . $testCase['keyPostfix'];
            $value = $testCase['value'];
            $json = json_encode($testCase['value']);

            $this->assertFalse($dataStore->keyExists($key), $testTitle);

            $dataStore->setValue($key, $value);
            $this->assertValue($dataStore, $key, $value, $json, $testTitle);

            $dataStore->deleteValue($key);
            $this->assertFalse($dataStore->keyExists($key), $testTitle);

            $this->assertTrue($dataStore->addValue($key, $value), $testTitle);
            $this->assertValue($dataStore, $key, $value, $json, $testTitle);

            $dataStore->deleteValue($key);
            $this->assertFalse($dataStore->keyExists($key), $testTitle);

            $dataStore->setJson($key, $json);
            $this->assertValue($dataStore, $key, $value, $json, $testTitle);

            $dataStore->deleteValue($key);
            $this->assertFalse($dataStore->keyExists($key), $testTitle);

            $this->assertTrue($dataStore->addJson($key, $json), $testTitle);
            $this->assertValue($dataStore, $key, $value, $json, $testTitle);
        }
    }

    public function testBadJson() {
        $dataStore = $this->dataStore;

        $badJsons = [ 'a', '123:123', '[[]' ];
        foreach ($badJsons as $json) {
            $exceptionCaught = false;
            try {
                $dataStore->setJson('somekey', $json);
            } catch (InvalidArgumentException $e) {
                $exceptionCaught = true;
            }
            $this->assertTrue($exceptionCaught);
        }
    }

    protected function assertValue(DataStore $dataStore, string $key, $value, string $json, string $testTitle) {
        $this->assertTrue($dataStore->keyExists($key), $testTitle);
        $this->assertEquals($value, $dataStore->getValue($key), $testTitle);
        $this->assertFalse($dataStore->addValue($key, $value), $testTitle);
        $this->assertFalse($dataStore->addJson($key, $json), $testTitle);
        $this->assertEquals($value, json_decode($dataStore->getJson($key), true), $testTitle);
    }

}