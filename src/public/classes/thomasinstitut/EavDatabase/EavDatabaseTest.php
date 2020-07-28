<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace ThomasInstitut\EavDatabase;

use Exception;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\Profiler\SimpleProfiler;
use ThomasInstitut\Profiler\TimeTracker;

/**
 * Class EavDatabaseTest
 *
 * Validation test for implementations of the EavDatabase interface
 *
 * To run with phpunit, create a class that extends PHPUnit\Framework\TestCase
 * with a method that sets up the EavDatabase implementation to test, calls
 * setEavDatabase and calls runAllTests()
 *
 * @package EavDatabase
 */
class EavDatabaseTest extends TestCase
{


    /**
     * @var EavDatabase
     */
    private $database;

    /**
     * @var string
     */
    private $testClassName;

    protected function setDatabase(EavDatabase $database, string $testClassName) {
        $this->database = $database;
        $this->testClassName = $testClassName;
    }

    /**
     * @param EavDatabase $database
     * @param string $testClassName
     * @throws Exception
     */
    public function runAllTests(EavDatabase $database, string $testClassName) {
        $this->setDatabase($database, $testClassName);
        $this->testEmptyDatabase();
        $this->testAddDelete();
        $this->testBadSet();
    }

    public function testBadSet() {


        $exceptionCaught = false;
        try {
            $this->database->set('', 'someAttribute', 'someValue');
        } catch(InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught,  $this->testClassName . ' : Bad entity Id');

        $exceptionCaught = false;
        try {
            $this->database->set('someEntity', '', 'someValue');
        } catch(InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught,  $this->testClassName . ' : Bad attribute');
    }

    public function testEmptyDatabase() {

        $testTitle = $this->testClassName . ': test Empty Database';

        // EntityNotFound exception must be thrown on getEntityData
        $exceptionCaught = false;
        try {
            $this->database->getEntityData('someEntity');
        } catch (EntityNotFoundException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $testTitle);

        // EntityNotFound exception must be thrown on get
        $exceptionCaught = false;
        try {
            $this->database->get('someEntity', 'someAttribute');
        } catch (AttributeNotFoundException $e) {
            $exceptionCaught = true;
        } catch (EntityNotFoundException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $testTitle);

        // No exceptions should be thrown on delete
        $this->database->delete('someEntity', 'someAttribute');
        $this->database->deleteEntity('someEntity');
    }

    /**
     * @throws Exception
     */
    public function testAddDelete() {
        $testPrefix = $this->testClassName . ': test add/delete';

        $numEntities = 50;
        $totalNumAttributes = 50;
        $attributesToAdd = 20;
        $randomReads = 50;
        $randomDeletions = 50;

        $entityIdPrefix = 'Entity_';
        $attributePrefix = 'Attribute_';

        $profiler = new SimpleProfiler();
        $profiler->registerProperty('dur', new TimeTracker());
        // populate the database and the testData array

        $profiler->start();
        $testData = [];
        for ($i = 0; $i < $numEntities; $i++) {
            $entityId = $entityIdPrefix . ($i+1);
            $testTitle = $testPrefix .  " : populating entity '$entityId'";
            for($j= 0; $j < $attributesToAdd; $j++) {
                $attribute = $attributePrefix . random_int(1, $totalNumAttributes);
                $testData[$entityId][$attribute] = $entityId . '-' . $attribute;
                $this->database->set($entityId, $attribute, $testData[$entityId][$attribute]);
                $this->assertEquals($testData[$entityId][$attribute], $this->database->get($entityId, $attribute), $testTitle);
            }
        }
        $profiler->lap('Populating');



        // do a bunch of random reads
        for($i=0; $i<$randomReads; $i++) {
            $entityId = $entityIdPrefix . random_int(1, $numEntities);
            $attribute =$attributePrefix . random_int(1, $totalNumAttributes);
            $testTitle = $testPrefix . " random read '$entityId'-'$attribute'";
            if (isset($testData[$entityId][$attribute])) {
                $this->assertEquals($testData[$entityId][$attribute], $this->database->get($entityId, $attribute), $testTitle);
            } else {
                $exceptionCaught = false;
                try {
                    $this->database->get($entityId, $attribute);
                } catch (AttributeNotFoundException $e) {
                    $exceptionCaught = true;
                }
                $this->assertTrue($exceptionCaught, $testTitle);
            }
        }
        $profiler->lap('Random reads');

        // validate the data for each entity
        for ($i = 0; $i < $numEntities; $i++) {
            $entityId = $entityIdPrefix . ($i+1);
            $testTitle = $testPrefix . " : data validation for entity '$entityId'";
            $entityData = $this->database->getEntityData($entityId);
            $this->assertEqualData($testData[$entityId], $entityData, $testTitle);
        }
        $profiler->lap('Data validation');

        // delete some attributes
        for ($i = 0; $i < $numEntities; $i++) {
            $entityId = $entityIdPrefix . ($i+1);

            $attributes = array_keys($testData[$entityId]);
            $attribute = $attributes[0];
            $testTitle = $testPrefix . " : attribute deletion '$entityId' :  '$attribute'";
            $this->database->delete($entityId, $attribute);
            $exceptionCaught = false;
            try {
                $this->database->get($entityId, $attribute);
            } catch (EavDatabaseException $e) {
                $exceptionCaught = true;
            }
            $this->assertTrue($exceptionCaught, $testTitle);
        }
        $profiler->lap('Delete attributes');

        // delete all attributes of an entity one by one
        $entityId = $entityIdPrefix . random_int(1, $numEntities);
        $attributes = $attributes = array_keys($testData[$entityId]);
        foreach($attributes as $attribute) {
            $this->database->delete($entityId, $attribute);
        }
        $exceptionCaught = false;
        try {
            $this->database->getEntityData($entityId);
        } catch (EntityNotFoundException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught, $testPrefix . ' : delete attributes one by one');

        $profiler->lap('Delete all atributes');

        // random deletions
        for($i=0; $i<$randomDeletions; $i++) {
            $entityId = $entityIdPrefix . random_int(1, $numEntities);
            $attribute = $attributePrefix . random_int(1, $totalNumAttributes);
            $testTitle = $testPrefix . " random deletion '$entityId'-'$attribute'";
            $this->database->delete($entityId, $attribute);

            $exceptionCaught = false;
            try {
                $this->database->get($entityId, $attribute);
            } catch (EavDatabaseException $e) {
                $exceptionCaught = true;
            }
            $this->assertTrue($exceptionCaught, $testTitle);
        }
        $profiler->lap('Random deletions');

        // delete entities
        for ($i=0; $i < $numEntities; $i++) {
            $entityId = $entityIdPrefix . random_int(1, $numEntities);
            $testTitle = $testPrefix . " delete entity '$entityId'";
            $this->database->deleteEntity($entityId);
            $exceptionCaught = false;
            try {
                $this->database->getEntityData($entityId);
            } catch (EntityNotFoundException $e) {
                $exceptionCaught = true;
            }
            $this->assertTrue($exceptionCaught, $testTitle);
        }


        $profiler->stop();
        //print_r($profiler->getLaps());

    }

    /**
     *  Asserts that the given arrays have exactly the same keys and same values
     *  foreach key
     *
     * @param array $expectedArray
     * @param array $testArray
     * @param string $msg
     */

    protected function assertEqualData(array $expectedArray, array $testArray, string $msg) {
        $testMsg = $msg . ' : equalDataAssertion';
        $this->assertCount(count($expectedArray), $testArray, $testMsg);
        $testArrayKeys = array_keys($testArray);
        foreach(array_keys($expectedArray) as $key) {
            $this->assertContains($key, $testArrayKeys, $testMsg);
            $this->assertEquals($expectedArray[$key], $testArray[$key], $testMsg);
        }
    }

}