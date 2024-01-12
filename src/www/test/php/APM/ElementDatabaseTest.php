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

namespace Test\APM;


use APM\System\ApmContainerKey;
use APM\System\SystemManager;
use AverroesProject\ColumnElement\Line;
use AverroesProject\Data\DataManager;
use AverroesProject\TxText\Abbreviation;
use AverroesProject\TxText\Addition;
use AverroesProject\TxText\CharacterGap;
use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\Deletion;
use AverroesProject\TxText\Gliph;
use AverroesProject\TxText\Illegible;
use AverroesProject\TxText\Initial;
use AverroesProject\TxText\Item;
use AverroesProject\TxText\Mark;
use AverroesProject\TxText\MathText;
use AverroesProject\TxText\NoWordBreak;
use AverroesProject\TxText\ParagraphMark;
use AverroesProject\TxText\Rubric;
use AverroesProject\TxText\Sic;
use AverroesProject\TxText\Text;
use AverroesProject\TxText\Unclear;
use Exception;
use PHPUnit\Framework\TestCase;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Element;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use Test\APM\Mockup\DatabaseTestEnvironment;


/**
 * Description of ElementTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ElementDatabaseTest extends TestCase {
    static DataManager $dataManager;

    private static ContainerInterface $container;
    private static DatabaseTestEnvironment $testEnvironment;
    private static LoggerInterface $logger;

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     * @throws Exception
     */
    public static function setUpBeforeClass() : void  {

        self::$testEnvironment = new DatabaseTestEnvironment();
        self::$container = self::$testEnvironment->getContainer();

        /** @var SystemManager $systemManager */
        $systemManager = self::$container->get(ApmContainerKey::SYSTEM_MANAGER);
        self::$dataManager = $systemManager->getDataManager();
        self::$logger = $systemManager->getLogger();
    }

    /**
     * @throws Exception
     */
    public function testEmptyDatabase()
    {
        $dm = self::$dataManager;
        self::$testEnvironment->emptyDatabase();
        $this->assertEquals([], $dm->getColumnElements(1, 1, 1));
    }

    /**
     * @depends testEmptyDatabase
     */
    public function testAddElementSimple() 
    {
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc', $numPages, 'la',
            'mss', 'local', 'TEST_ELEM');
        for ($i = 1; $i <= $numPages; $i++) {
            $result = $dm->addNewColumn($docId, $i);
            $this->assertNotFalse($result, "Adding column to doc $docId, page $i");
        }
        $editorTid = self::$testEnvironment->createUserByUsername('TestEditor1');
        
        $goodElement = new Line();
        $goodElement->id = 200; // this will be ignored!
        $goodElement->pageId = $dm->getPageIdByDocPage($docId, 1);
        $goodElement->columnNumber = 1;
        $goodElement->editorTid = $editorTid;
        $goodElement->handId = 0;
        // One of each item type, for good measure  (no item line break at the moment)
        ItemArray::addItem($goodElement->items, new Text(0,-1,'Some text '));
        ItemArray::addItem($goodElement->items, new Rubric(0,-1,'Rubric '));
        ItemArray::addItem($goodElement->items, new Sic(0,-1,'loose', 'lose'));
        ItemArray::addItem($goodElement->items, new Mark(0,-1));
        ItemArray::addItem($goodElement->items, new Unclear(0, -1, 'unclear', 'Hey', 'Hey you'));
        ItemArray::addItem($goodElement->items, new Illegible(0,-1,5));
        ItemArray::addItem($goodElement->items, new Abbreviation(0,-1,'Mr.', 'Mister'));
        ItemArray::addItem($goodElement->items, new Gliph(0,-1,'ā'));
        ItemArray::addItem($goodElement->items, new Deletion(0,-1,'deleted', 'strikeout'));
        ItemArray::addItem($goodElement->items, new Addition(0,-1,'added', 'above'));
        ItemArray::addItem($goodElement->items, new ChunkMark(0, -1, 'AW', 1, ChunkMark::CHUNK_START,'A'));
        ItemArray::addItem($goodElement->items, new NoWordBreak(0,-1));
        ItemArray::addItem($goodElement->items, new Initial(0,-1, "I"));
        ItemArray::addItem($goodElement->items, new CharacterGap(0,-1));
        ItemArray::addItem($goodElement->items, new ParagraphMark(0,-1));
        ItemArray::addItem($goodElement->items, new MathText(0,-1, 'some text'));
        $goodElement->lang = 'la';
        
        
        // Null page ID        
        $element = clone $goodElement;
        $element->pageId = -1;
        $res1 = $dm->insertNewElement($element);
        $this->assertFalse($res1);
        
        // Non existent page
        $element = clone $goodElement;
        $element->pageId = 1500;
        $res2 = $dm->insertNewElement($element);
        $this->assertFalse($res2);
        
        // Column = 0
        $element = clone $goodElement;
        $element->columnNumber = 0;
        $res3 = $dm->insertNewElement($element);
        $this->assertFalse($res3);
        
        // Non-existent column
        $element = clone $goodElement;
        $element->columnNumber = 4;
        $res4 = $dm->insertNewElement($element);
        $this->assertFalse($res4);
        
        // Wrong editor ID
        $element = clone $goodElement;
        $element->editorTid = 0;
        $res5 = $dm->insertNewElement($element);
        $this->assertFalse($res5);

        // No items
        $element = clone $goodElement;
        $element->items = [];
        $res6 = $dm->insertNewElement($element);
        $this->assertFalse($res6);
        
        // Wrong language
        $element = clone $goodElement;
        $element->lang = '';
        $res7 = $dm->insertNewElement($element);
        $this->assertFalse($res7); 
        $element->lang = 'fr';
        $res8 = $dm->insertNewElement($element);
        $this->assertFalse($res8);
        
        // Simple insert
        self::$logger->debug("Simple insert");
        $newElement = $dm->insertNewElement($goodElement);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals(0, $newElement->seq);
        $this->assertCount(count($goodElement->items), 
                $newElement->items);
        
        $elementArray = $dm->getColumnElements($docId, 1, 1);
        $this->assertCount(1, $elementArray);
        $this->assertEquals($newElement, $elementArray[0]);
    }

    private function createTestElement(int $pageId, int $editorId, int $index) : Element {
        $element = new Line();
        $element->pageId = $pageId;
        $element->columnNumber = 1;
        $element->editorTid = $editorId;
        $element->lang = 'la';
        $element->handId = 0;
        ItemArray::addItem($element->items, new Text(0,-1,"Text $index "));
        ItemArray::addItem($element->items, new Rubric(0,-1,"with rubric $index" ));
        ItemArray::addItem($element->items, new Text(0,-1,"and more text $index"));
        ItemArray::addItem($element->items, new Abbreviation(0,-1,"LOL $index",
            "laughing out loud  $index"));

        return $element;
    }


    /**
     * @depends testEmptyDatabase
     * @throws Exception
     */
    public function testAddElements()
    {
        self::$testEnvironment->emptyDatabase();
        $numElements = 10;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc 2', $numPages, 'la',
            'mss', 'local', 'TEST_ELEM-2');
        for ($i = 1; $i <= $numPages; $i++) {
            $result = $dm->addNewColumn($docId, $i);
            $this->assertNotFalse($result, "Adding column to doc $docId, page $i");
        }
        $editorId = self::$testEnvironment->createUserByUsername('Editor2');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        $this->assertGreaterThan(0, $pageId);

        for ($i = 0; $i < $numElements; $i++) {
            $element = $this->createTestElement($pageId, $editorId, $i);
            $newElement = $dm->insertNewElement($element);
            $this->assertNotFalse($newElement);
            $this->assertNotEquals(0, $newElement->id);
            $this->assertEquals($i, $newElement->seq);
            $this->assertCount(count($element->items), 
                    $newElement->items);
        }
        
        // Now elements with sequence
        
        // This will be inserted at the end
        $element2 = $this->createTestElement($pageId, $editorId, 1002);
        $element2->seq = $numElements+100;
        $newElement = $dm->insertNewElement($element2, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals($numElements, $newElement->seq);
        $this->assertCount(count($element2->items),
                    $newElement->items);
        
        // This will be inserted as the first element in the column
        $element3 = $this->createTestElement($pageId, $editorId, 1003);
        $element3->seq = 1;
        $newElement = $dm->insertNewElement($element3, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals(1, $newElement->seq);
        $this->assertCount(count($element3->items),
                    $newElement->items);
        
        
        // another test
        $element4 = $this->createTestElement($pageId, $editorId, 1004);
        $element4->seq = $numElements;
        $newElement = $dm->insertNewElement($element4, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals($numElements, $newElement->seq);
        $this->assertCount(count($element4->items),
                    $newElement->items);

    }

    /**
     * @depends testEmptyDatabase
     * @throws Exception
     */
    public function testDeleteElements()
    {
        $numElements = 10;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc 3', $numPages, 'la',
            'mss', 'local', 'TEST_ELEM-3');
        for ($i = 1; $i <= $numPages; $i++) {
            $result = $dm->addNewColumn($docId, $i);
            $this->assertNotFalse($result, "Adding column to doc $docId, page $i");
        }
        $editorId = self::$testEnvironment->createUserByUsername('TestEditor3');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = $this->createTestElement($pageId, $editorId, $i);
            $newElement = $dm->insertNewElement($element);
            $this->assertNotFalse($newElement);
            $this->assertNotEquals(0, $newElement->id);
            $this->assertCount(count($element->items), 
                    $newElement->items);
            
            $result = $dm->deleteElement($newElement->id);
            $this->assertTrue($result);
            $retrievedElement = $dm->getElementById($newElement->id);
            $this->assertFalse($retrievedElement);
            foreach ($newElement->items as $item) {
                $retrievedItem = $dm->getItemById($item->id);
                $this->assertFalse($retrievedItem);
            }
        }
    }

    /**
     * @param Item[] $items
     * @param int $newStartId
     * @param int $step
     * @return Item[]
     */
    private function rewriteItemIds(array $items, int $newStartId, int $step) : array{
        $newItems = [];
        foreach($items as $i => $item) {
            $newItem = clone $item;
            $newItem->id = $newStartId + $i * $step;
            $newItems[] = $newItem;
        }
        return $newItems;
    }

//    private function extractKey(array $someArray, string $key) : array {
//        return array_map( function($item) use ($key) { return $item->$key;}, $someArray);
//    }

    /**
     * @depends testEmptyDatabase
     * @throws Exception
     */
    public function testUpdateElements()
    {
//        self::$testEnvironment->emptyDatabase();
        $numElements = 10;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc 4', $numPages, 'la',
            'mss', 'local', 'TEST_ELEM-4');
        for ($i = 1; $i <= $numPages; $i++) {
            $result = $dm->addNewColumn($docId, $i);
            $this->assertNotFalse($result, "Adding column to doc $docId, page $i");
        }
        $editorId = self::$testEnvironment->createUserByUsername('TestEditor4');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        $elementIds = [];
        for ($i=0; $i < $numElements; $i++) {
            $element = $this->createTestElement($pageId, $editorId, $i);
            $elementIds[] = $dm->insertNewElement($element)->id;
        }
        
        // TEST 1 : no changes in new element
        $testElementId = $elementIds[0];
        $currentElement = $dm->getElementById($testElementId);
        $newVersion = clone $currentElement;
        // item ids should be irrelevant
        $newVersion->items = $this->rewriteItemIds($newVersion->items, 100, 1);
        list ($updatedElementId, $itemIds) = $dm->updateElement($newVersion, $currentElement);
        $this->assertEquals($testElementId, $updatedElementId);
        $updatedElement = $dm->getElementById($updatedElementId);
        $this->assertTrue(Element::isElementDataEqual($updatedElement, 
                $currentElement));
        for ($i=0; $i < count($currentElement->items); $i++)  {
            $this->assertEquals(
                $currentElement->items[$i]->id,
                $updatedElement->items[$i]->id,
                "Comparing element $updatedElementId item $i"
            );
            // updated itemIds should point to updated element's item ids
            $this->assertEquals(
                $itemIds[$newVersion->items[$i]->id],
                $updatedElement->items[$i]->id
            );
        }
        
        // TEST 2: different element id, same data
        // Even if the id of the new element is different, there should
        // not be any real update to the DB if the data is the same
        $testElementId2 = $elementIds[1];
        $currentElement2 = $dm->getElementById($testElementId2);
        $newVersion2 = clone $currentElement2;
        $newVersion2->id = 0;
        // item ids should be irrelevant
        $newVersion2->items = $this->rewriteItemIds($newVersion2->items, 200, 2);
        list ($id2, $itemIds2) = $dm->updateElement($newVersion2, $currentElement2);
        $this->assertEquals($testElementId2, $id2);
        $updatedElement2 = $dm->getElementById($id2);
        $this->assertTrue(Element::isElementDataEqual($updatedElement2, 
                $currentElement2));
        for ($i=0; $i < count($currentElement2->items); $i++)  {
            $this->assertEquals(
                $currentElement2->items[$i]->id,
                $updatedElement2->items[$i]->id
            );
            // updated itemIds should point to updated element's item ids
            $this->assertEquals(
                $itemIds2[$newVersion2->items[$i]->id],
                $updatedElement2->items[$i]->id
            );
        }
        
        // TEST3: Change in the element's data
        $testElementId3 = $elementIds[2];
        $currentElement3 = $dm->getElementById($testElementId3);
        $newVersion3 = clone $currentElement3;
        $newVersion3->type = Element::HEAD;  // Different type!
        // item ids should be irrelevant
        $newVersion3->items = $this->rewriteItemIds($newVersion3->items, 300, 3);
        list ($id3, $itemIds3) = $dm->updateElement($newVersion3, $currentElement3);
        $this->assertEquals($testElementId3, $id3);
        $updatedElement3 = $dm->getElementById($id3);
        for ($i=0; $i < count($currentElement3->items); $i++)  {
            $this->assertEquals(
                $currentElement3->items[$i]->id,
                $updatedElement3->items[$i]->id
            );
            // updated itemIds should point to updated element's item ids
            $this->assertEquals(
                $itemIds3[$newVersion3->items[$i]->id],
                $updatedElement3->items[$i]->id
            );
        }
        
        // TEST 4: Two items in switched position
        $testElementId4 = $elementIds[3];
        $currentElement4 = $dm->getElementById($testElementId4);
        $newVersion4 = clone $currentElement4;
        $newVersion4->items = $this->rewriteItemIds($newVersion4->items, 100, 1);

        // switching the first two items
        $newVersion4->items = [
            $newVersion4->items[1],
            $newVersion4->items[0],
            $newVersion4->items[2],
            $newVersion4->items[3],
        ];
        list ($id4,) = $dm->updateElement($newVersion4, $currentElement4);
        $this->assertEquals($testElementId4, $id4);
        $updatedElement4 = $dm->getElementById($id4);
        $this->assertTrue(Element::isElementDataEqual($updatedElement4, 
                $currentElement4));
        $this->assertCount(4, $updatedElement4->items);

        // ids of the non-switched items should be the same
        for ($i = 2; $i <= 3; $i++) {
            $this->assertEquals($currentElement4->items[$i]->id, $updatedElement4->items[$i]->id);
        }
    }

    /**
     * @depends testEmptyDatabase
     * @throws Exception
     */
    public function testUpdateColumnElements() 
    {
        $numElements = 10;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc 5', $numPages, 'la',
            'mss', 'local', 'TEST_ELEM-5');
        for ($i = 1; $i <= $numPages; $i++) {
            $result = $dm->addNewColumn($docId, $i);
            $this->assertNotFalse($result, "Adding column to doc $docId, page $i");
        }
        $originalEditor = self::$testEnvironment->createUserByUsername('EditorUpdateColumns');
        $reviewer = self::$testEnvironment->createUserByUsername('UpdateColumnsReviewer1');
        $reviewer2 = self::$testEnvironment->createUserByUsername('UpdateColumnsReviewer2');
        $reviewer3 = self::$testEnvironment->createUserByUsername('UpdateColumnsReviewer3');
        $reviewer4 = self::$testEnvironment->createUserByUsername('UpdateColumnsReviewer4');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new Line();
            $element->editorTid = $originalEditor;

            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text(0,-1,"Original Line ". $i+1));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);

            $dm->insertNewElement($element);
        }
        $originalElements = $dm->getColumnElementsByPageId($pageId, 1);
        //print ("ORIGINAL ELEMENTS: \n\n");
        //print_r($originalElements);
        
        // TEST 1: no changes in the lines, just a new editor
        // There should not be any change in the database
        //print "\n\n========== TEST 1 ===============\n\n";
        $newElements = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->editorTid = $reviewer;

            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text(0,-1,"Original Line ". $i+1));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);

            $newElements[] = $element;
        }
        $dm->updateColumnElements($pageId, 1, $newElements);
        //print "Editor id: " . $reviewer . " (but no changes in DB) \n";
        $updatedElements = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertCount(count($originalElements), $updatedElements);
        for ($i = 0; $i < count($originalElements); $i++) {
            $originalElement = $originalElements[$i];
            $updatedElement = $updatedElements[$i];
            $this->assertEquals($originalElement->id, $updatedElement->id);
            $this->assertEquals($originalElement->items[0]->id, $updatedElement->items[0]->id);
        }
        
        // TEST 2: Changes in all lines
        // Elements should reflect new editor, items should all change
        $newElements2 = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->editorTid = $reviewer;

            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text(0,-1,"Changed Line ". $i+1));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);

            $newElements2[] = $element;
        }
        $dm->updateColumnElements($pageId, 1, $newElements2);
        $updatedElements2 = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertCount($numElements, $updatedElements2);
        for ($i = 0; $i < $numElements; $i++) {
            $this->assertEquals($updatedElements2[$i]->id, $originalElements[$i]->id);
            $this->assertEquals($updatedElements2[$i]->seq, $originalElements[$i]->seq);
            $this->assertNotEquals($updatedElements2[$i]->editorTid, $originalElements[$i]->editorTid);
            $this->assertEquals($reviewer, $updatedElements2[$i]->editorTid);
        }
        
        // TEST 3: Text Change in one line
        // Only one element must change
        //print "\n\n========== TEST 3 ===============\n\n";
        $originalElements3 = $updatedElements2;
        $newElements3 = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->editorTid = $reviewer2;

            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text(0,-1,"Changed Line ". $i+1));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);

            $newElements3[] = $element;
        }
        //print "Editor Id: " . $reviewer2 . "\n";
        $newElements3[0]->items[0]->theText = 'Test 3 Line 1';
        $dm->updateColumnElements($pageId, 1, $newElements3);
        $updatedElements3 = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertCount($numElements, $updatedElements3);
        $this->assertEquals($updatedElements3[0]->id, $originalElements3[0]->id); 
        $this->assertEquals($updatedElements3[0]->seq, $originalElements3[0]->seq); // same sequence
        $this->assertNotEquals($updatedElements3[0]->editorTid, $originalElements3[0]->editorTid);
        $this->assertEquals($reviewer2, $updatedElements3[0]->editorTid);
        for ($i = 1; $i < $numElements; $i++) {
            $this->assertEquals($updatedElements3[$i]->id, $originalElements3[$i]->id);
            $this->assertEquals($updatedElements3[$i]->seq, $originalElements3[$i]->seq);
            $this->assertEquals($updatedElements3[$i]->editorTid, $originalElements3[$i]->editorTid);
            $this->assertEquals($reviewer, $updatedElements3[$i]->editorTid);
        }
        
        // TEST 4: Text and type change in one line, checking reported item ids
        //print "\n\n========== TEST 4 ===============\n\n";
        $newElements4 = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->id = $i+1000;
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorTid = $reviewer3;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text($i+400,0,"Test 2 Line ". $i+1));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);
            $newElements4[] = $element;
        }
        $newElements4[0]->type = Element::HEAD;
        $newElements4[0]->items[0]->theText = 'Test 4 Line 1';
        $updatedItemIds4 = $dm->updateColumnElements($pageId, 1, $newElements4);
        $updatedElements4 = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertCount($numElements, $updatedElements4);
        for ($i = 0; $i < $numElements; $i++) {
            $this->assertEquals($i, $updatedElements4[$i]->seq);
            $this->assertEquals($updatedItemIds4[$newElements4[$i]->items[0]->id], $updatedElements4[$i]->items[0]->id);
        }
        
        // TEST 5: More items per line, checking reported item ids
        //print "\n\n========== TEST 5 ===============\n\n";
        $givenItemId = -1000;
        $newElements5 = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->id = $i+2000; // Irrelevant
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorTid = $reviewer4;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Rubric($givenItemId--,0,"Test 5"));
            ItemArray::addItem($element->items, new Text($givenItemId--,1,": line". $i+1));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);
            $newElements5[] = $element;
        }
        //print "Editor Id: " . $reviewer4 . "\n";
        $updatedItemIds5 = $dm->updateColumnElements($pageId, 1, $newElements5);
        $updatedElements5 = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertCount($numElements, $updatedElements5);
        for ($i = 0; $i < $numElements; $i++) {
            $this->assertEquals($i, $updatedElements5[$i]->seq);
            $this->assertEquals($updatedItemIds5[$newElements5[$i]->items[0]->id], $updatedElements5[$i]->items[0]->id);
            $this->assertEquals($updatedItemIds5[$newElements5[$i]->items[1]->id], $updatedElements5[$i]->items[1]->id);
        }
    }

    public function debug(string $msg) {

    }
}

