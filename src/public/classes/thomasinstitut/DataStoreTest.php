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



namespace ThomasInstitut;


use InvalidArgumentException;
use PHPUnit\Framework\TestCase;


/**
 * Class DataStoreTest
 *
 * Validation test for DataStore implementations.
 *
 * To run with phpunit, create a class that extends PHPUnit\Framework\TestCase
 * with a methods that sets up the iDataStore implementation to test, calls
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
     * @var iDataStore
     */
    private $dataStore;

    /**
     * @var string
     */
    private $testClassName;

    protected function setDataStore(iDataStore $dataStore, string $testClassName) {
        $this->dataStore = $dataStore;
        $this->testClassName = $testClassName;
    }

    public function runAll(iDataStore $dataStore, string $testClassName) {
        $this->setDataStore($dataStore, $testClassName);
        $this->testSimple();
    }

    public function testSimple() {
        $dataStore = $this->dataStore;

        $somePropertyName = 'someProperty';
        $testKey = 'testKey';
        $propertyValue1 = [ $testKey => 'value1'];
        $propertyValue2 = [ $testKey => 'value2'];

        $testName = $this->testClassName . ': testing InvalidArgumentExceptions on empty DataStore';
        $exceptionCaught = false;
        try {
            $dataStore->getAllProperties(1);
        } catch(InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $testName);

        $exceptionCaught = false;
        try {
            $dataStore->getProperty(1, $somePropertyName);
        } catch(InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $testName);

        $exceptionCaught = false;
        try {
            $dataStore->setProperty(1, $somePropertyName, [ $propertyValue1 ]);
        } catch(InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $testName);

        $exceptionCaught = false;
        try {
            $dataStore->addPropertyValue(1, $somePropertyName, $propertyValue1);
        } catch(InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $testName);

        $testName = $this->testClassName . ': testing DataStore with one object';
        $id = $dataStore->addNewObject();

        $this->assertEquals([], $dataStore->getAllProperties($id), $testName);
        $this->assertEquals([], $dataStore->getProperty($id, $somePropertyName), $testName);

        $testName = $this->testClassName . ': testing DataStore with one object, adding property values';
        $dataStore->addPropertyValue($id, $somePropertyName, $propertyValue1);
        $this->assertCount(1, $dataStore->getAllProperties($id), $testName);
        $retrievedProperty = $dataStore->getProperty($id, $somePropertyName);
        $this->assertEquals([ $propertyValue1 ], $retrievedProperty, $testName);

        $dataStore->addPropertyValue($id, $somePropertyName, $propertyValue2);
        $this->assertCount(1, $dataStore->getAllProperties($id), $testName);
        $retrievedProperty = $dataStore->getProperty($id, $somePropertyName);
        $this->assertCount(2, $retrievedProperty, $testName);
        $this->assertEquals($propertyValue1, $retrievedProperty[0], $testName);
        $this->assertEquals($propertyValue2, $retrievedProperty[1], $testName);

        $testName = $this->testClassName . ': testing DataStore with two objects, setting property values';
        $id = $dataStore->addNewObject();

        $dataStore->setProperty($id, $somePropertyName, [$propertyValue1]);
        $this->assertCount(1, $dataStore->getAllProperties($id), $testName);
        $retrievedProperty = $dataStore->getProperty($id, $somePropertyName);
        $this->assertEquals([ $propertyValue1 ], $retrievedProperty , $testName);

        $dataStore->addPropertyValue($id, $somePropertyName, $propertyValue2);
        $this->assertCount(1, $dataStore->getAllProperties($id), $testName);
        $retrievedProperty = $dataStore->getProperty($id, $somePropertyName);
        $this->assertCount(2, $retrievedProperty, $testName);
        $this->assertEquals($propertyValue1, $retrievedProperty[0], $testName);
        $this->assertEquals($propertyValue2, $retrievedProperty[1], $testName);

    }

}