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
use AverroesProject\Data\EdNoteManager;
use AverroesProject\TxText\Abbreviation;
use AverroesProject\TxText\Addition;
use AverroesProject\TxText\CharacterGap;
use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\Deletion;
use AverroesProject\TxText\Gliph;
use AverroesProject\TxText\Illegible;
use AverroesProject\TxText\Initial;
use AverroesProject\TxText\Mark;
use AverroesProject\TxText\MathText;
use AverroesProject\TxText\NoWordBreak;
use AverroesProject\TxText\ParagraphMark;
use AverroesProject\TxText\Rubric;
use AverroesProject\TxText\Sic;
use AverroesProject\TxText\Text;
use AverroesProject\TxText\Unclear;
use DI\Container;
use Monolog\Logger;
use PHPUnit\Framework\TestCase;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Element;


/**
 * Description of ElementTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ElementDatabaseTest extends TestCase {
    /**
     *
     * @var DataManager
     */
    static $dataManager;
    /**
     * @var Container
     */
    private static $container;
    /**
     * @var DatabaseTestEnvironment
     */
    private static $testEnvironment;
    /**
     * @var EdNoteManager
     */
    private static $edNoteManager;

    /**
     * @var Logger
     */
    private static $logger;

    public static function setUpBeforeClass() : void  {
        global $apmTestConfig;

        self::$testEnvironment = new DatabaseTestEnvironment($apmTestConfig);
        self::$container = self::$testEnvironment->getContainer();

        /** @var SystemManager $systemManager */
        $systemManager = self::$container->get(ApmContainerKey::SYSTEM_MANAGER);


        self::$dataManager = $systemManager->getDataManager();
        self::$edNoteManager = self::$dataManager->edNoteManager;
        self::$logger = $systemManager->getLogger();

    }
    
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
        $numPages = 10;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc', 'TED', $numPages, 'la', 
                'mss', 'local', 'TESTELEM');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editorId = $dm->userManager->createUserByUsername('testeditor');
        
        $goodElement = new Line();
        $goodElement->id = 200; // this will be ignored!
        $goodElement->pageId = $dm->getPageIdByDocPage($docId, 1);
        $goodElement->columnNumber = 1;
        $goodElement->editorId = $editorId;
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
        $element->pageId = NULL;
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
        $element->editorId = 0;
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
    
    /**
     * @depends testAddElementSimple
     */
    public function testAddElements()
    {
        $numElements = 10;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc 2', 'TED-2', $numPages, 'la', 
                'mss', 'local', 'TESTELEM-2');
        for ($i = 0; $i < $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editorId = $dm->userManager->createUserByUsername('testeditor2');
        $pageId =  $dm->getPageIdByDocPage($docId, 2);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editorId;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new Text(0,-1,"This is $i "));
            ItemArray::addItem($element->items, new Rubric(0,-1,'with rubric '));
            ItemArray::addItem($element->items, new Text(0,-1,'and more text '));
            ItemArray::addItem($element->items, new Abbreviation(0,-1,'LOL',
                    'laughing out loud'));
            $newElement = $dm->insertNewElement($element);
            $this->assertNotFalse($newElement);
            $this->assertNotEquals(0, $newElement->id);
            $this->assertEquals($i, $newElement->seq);
            $this->assertCount(count($element->items), 
                    $newElement->items);
        }
        
        // Now elements with sequence
        
        // This will be inserted at the end
        $element->seq = $numElements+100;
        $newElement = $dm->insertNewElement($element, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals($numElements, $newElement->seq);
        $this->assertCount(count($element->items), 
                    $newElement->items);
        
        // This will be inserted as the first element in the column
        $element->seq = 1;
        $newElement = $dm->insertNewElement($element, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals(1, $newElement->seq);
        $this->assertCount(count($element->items), 
                    $newElement->items);
        
        
                    
        $element->seq = $numElements;
        $newElement = $dm->insertNewElement($element, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals($numElements, $newElement->seq);
        $this->assertCount(count($element->items), 
                    $newElement->items);

    }
    
    public function testDeleteElements()
    {
        $numElements = 5;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc 3', 'TED-3', $numPages, 'la', 
                'mss', 'local', 'TESTELEM-3');
        for ($i = 0; $i < $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editorId = $dm->userManager->createUserByUsername('testeditor3');
        $pageId =  $dm->getPageIdByDocPage($docId, 3);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editorId;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new Text(0,-1,"This is $i "));
            ItemArray::addItem($element->items, new Rubric(0,-1,'with rubric '));
            ItemArray::addItem($element->items, new Text(0,-1,'and more text '));
            ItemArray::addItem($element->items, new Abbreviation(0,-1,'LOL',
                    'laughing out loud'));
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
    
    public function testUpdateElements()
    {
        $numElements = 5;
        $numPages = 5;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc 4', 'TED-4', $numPages, 'la', 
                'mss', 'local', 'TESTELEM-4');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editorId = $dm->userManager->createUserByUsername('testeditor4');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        $elementIds = [];
        for ($i=0; $i<$numElements; $i++) {
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editorId;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new Rubric(0,0,"Hello "));
            ItemArray::addItem($element->items, new Text(0,1,'darkness '));
            ItemArray::addItem($element->items, new Text(0,2,'my '));
            ItemArray::addItem($element->items, new Abbreviation(0,3,'f. ',
                    'friend'));
            $elementIds[] = $dm->insertNewElement($element)->id;
        }
        
        // TEST 1 : no changes in new element
        $testElementId = $elementIds[0];
        $currentElement = $dm->getElementById($testElementId);
        $newVersion = clone $currentElement;
        $newVersion->items = [];
        ItemArray::addItem($newVersion->items, new Rubric(100,-1,"Hello "));
        ItemArray::addItem($newVersion->items, new Text(101,-1,'darkness '));
        ItemArray::addItem($newVersion->items, new Text(102,-1,'my '));
        ItemArray::addItem($newVersion->items, new Abbreviation(103,-1,'f. ',
                'friend'));
        ItemArray::setLang($newVersion->items, 'la');
        ItemArray::setHandId($newVersion->items, 0);
        list ($id, $itemIds) = $dm->updateElement($newVersion, $currentElement);
        $this->assertEquals($testElementId, $id);
        $updatedElement = $dm->getElementById($id);
        $this->assertTrue(Element::isElementDataEqual($updatedElement, 
                $currentElement));
        for ($i=0; $i < count($currentElement->items); $i++)  {
            $this->assertEquals(
                $currentElement->items[$i]->id,
                $updatedElement->items[$i]->id
            );
            // updated itemIds should point to updated element's item ids
            $this->assertEquals(
                $itemIds[$newVersion->items[$i]->id],
                $updatedElement->items[$i]->id
            );
        }
        
        // TEST 2: different element Id, same data
        // Even if the id of the new element is different, there should
        // not be any real update to the DB if the data is the same
        $testElementId2 = $elementIds[1];
        $currentElement2 = $dm->getElementById($testElementId2);
        $newVersion2 = clone $currentElement2;
        $newVersion2->id = 0;
        $newVersion2->items = [];
        ItemArray::addItem($newVersion2->items, new Rubric(100,-1,"Hello "));
        ItemArray::addItem($newVersion2->items, new Text(101,-1,'darkness '));
        ItemArray::addItem($newVersion2->items, new Text(102,-1,'my '));
        ItemArray::addItem($newVersion2->items, new Abbreviation(103,-1,'f. ',
                'friend'));
        ItemArray::setLang($newVersion2->items, 'la');
        ItemArray::setHandId($newVersion2->items, 0);
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
        $newVersion3->items = [];
        ItemArray::addItem($newVersion3->items, new Rubric(100,-1,"Hello "));
        ItemArray::addItem($newVersion3->items, new Text(101,-1,'darkness '));
        ItemArray::addItem($newVersion3->items, new Text(102,-1,'my '));
        ItemArray::addItem($newVersion3->items, new Abbreviation(103,-1,'f. ',
                'friend'));
        ItemArray::setLang($newVersion3->items, 'la');
        ItemArray::setHandId($newVersion3->items, 0);
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
        $newVersion4->items = [];
        ItemArray::addItem($newVersion4->items, new Rubric(-1001,-1,"Hello "));
        ItemArray::addItem($newVersion4->items, new Text(-1,-1,'my '));
        ItemArray::addItem($newVersion4->items, new Text(-1,-1,'darkness '));
        ItemArray::addItem($newVersion4->items, new Abbreviation(-1003,-1,'f. ',
                'friend'));
        ItemArray::setLang($newVersion4->items, 'la');
        ItemArray::setHandId($newVersion4->items, 0);
        
        list ($id4, $itemIds4) = $dm->updateElement($newVersion4, $currentElement4);
        $this->assertEquals($testElementId4, $id4);
        $updatedElement4 = $dm->getElementById($id4);
        $this->assertTrue(Element::isElementDataEqual($updatedElement4, 
                $currentElement4));
        $this->assertCount(4, $updatedElement4->items);
        $this->assertEquals(
            $currentElement4->items[0]->id,
            $updatedElement4->items[0]->id
        );
        $this->assertEquals(
            $currentElement4->items[3]->id,
            $updatedElement4->items[3]->id
        );
        // updated item Ids should correspond to the new version in the DB
        //var_dump($itemIds4);
        for ($i=0; $i < count($newVersion4->items); $i++)  {
            // only check new version item Ids !== -1
            if ($newVersion4->items[$i]->id !== -1) {
                $this->assertEquals(
                    $itemIds4[$newVersion4->items[$i]->id],
                    $updatedElement4->items[$i]->id
                );
            }
        }
    }
    
    public function testUpdateColumnElements() 
    {
        $numElements = 5;
        $numPages = 1;
        $dm = self::$dataManager;
        $docId = $dm->newDoc('Test Elements Doc 5', 'TED-5', $numPages, 'la', 
                'mss', 'local', 'TESTELEM-5');
        for ($i = 1; $i <= $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $originalEditor = $dm->userManager->createUserByUsername('testcoled');
        $reviewer = $dm->userManager->createUserByUsername('testcolrev');
        $reviewer2 = $dm->userManager->createUserByUsername('testcolrev2');
        $reviewer3 = $dm->userManager->createUserByUsername('testcolrev3');
        $reviewer4 = $dm->userManager->createUserByUsername('testcolrev5');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        $elementIds = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $originalEditor;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text(0,-1,"Original Line ". (string)($i+1)));
            $elementIds[] = $dm->insertNewElement($element)->id;
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
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $reviewer;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text($i+100,0,"Original Line ". (string)($i+1)));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);
            $newElements[] = $element;
        }
        //print "Editor Id: " . $reviewer . " (but no changes in DB) \n";
        $updatedItemIds = $dm->updateColumnElements($pageId, 1, $newElements);
        $updatedElements = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertEquals($updatedElements, $originalElements);
        for ($i = 0; $i < $numElements; $i++) {
            $this->assertEquals($updatedItemIds[$newElements[$i]->items[0]->id], $updatedElements[$i]->items[0]->id);
        }
        
        // TEST 2: Changes in all lines
        // Elements should reflect new editor, items should all change
        //print "\n\n========== TEST 2 ===============\n\n";
        $newElements2 = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $reviewer;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text($i+200,0,"Test 2 Line ". (string)($i+1)));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);
            $newElements2[] = $element;
        }
        //print "Editor Id: " . $reviewer . "\n";
        $updatedItemIds2 = $dm->updateColumnElements($pageId, 1, $newElements2);
        $updatedElements2 = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertCount($numElements, $updatedElements2);
        for ($i = 0; $i < $numElements; $i++) {
            $this->assertEquals($updatedElements2[$i]->id, $originalElements[$i]->id);
            $this->assertEquals($updatedElements2[$i]->seq, $originalElements[$i]->seq);
            $this->assertNotEquals($updatedElements2[$i]->editorId, $originalElements[$i]->editorId);
            $this->assertEquals($reviewer, $updatedElements2[$i]->editorId);
            $this->assertEquals($updatedItemIds2[$newElements2[$i]->items[0]->id], $updatedElements2[$i]->items[0]->id);
        }
        
        // TEST 3: Text Change in one line
        // Only one element must change
        //print "\n\n========== TEST 3 ===============\n\n";
        $originalElements3 = $updatedElements2;
        $newElements3 = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->id = $i+100;
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $reviewer2;
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text($i+300,0,"Test 2 Line ". (string)($i+1)));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);
            $newElements3[] = $element;
        }
        //print "Editor Id: " . $reviewer2 . "\n";
        $newElements3[0]->items[0]->theText = 'Test 3 Line 1';
        $updatedItemIds3 = $dm->updateColumnElements($pageId, 1, $newElements3);
        $updatedElements3 = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertCount($numElements, $updatedElements3);
        $this->assertEquals($updatedElements3[0]->id, $originalElements3[0]->id); 
        $this->assertEquals($updatedElements3[0]->seq, $originalElements3[0]->seq); // same sequence
        $this->assertNotEquals($updatedElements3[0]->editorId, $originalElements3[0]->editorId);
        $this->assertEquals($reviewer2, $updatedElements3[0]->editorId);
        $this->assertEquals($updatedItemIds3[$newElements3[0]->items[0]->id], $updatedElements3[0]->items[0]->id);
        for ($i = 1; $i < $numElements; $i++) {
            $this->assertEquals($updatedElements3[$i]->id, $originalElements3[$i]->id);
            $this->assertEquals($updatedElements3[$i]->seq, $originalElements3[$i]->seq);
            $this->assertEquals($updatedElements3[$i]->editorId, $originalElements3[$i]->editorId);
            $this->assertEquals($reviewer, $updatedElements3[$i]->editorId);
            $this->assertEquals($updatedItemIds3[$newElements3[$i]->items[0]->id], $updatedElements3[$i]->items[0]->id);
        }
        
        // TEST 4: Text and type change in one line 
        // Line elements will be bumped up, new items created
        //print "\n\n========== TEST 4 ===============\n\n";
        $originalElements4 = $updatedElements3;
        $newElements4 = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->id = $i+1000;
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $reviewer3; 
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Text($i+400,0,"Test 2 Line ". (string)($i+1)));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);
            $newElements4[] = $element;
        }
        //print "Editor Id: " . $reviewer3 . "\n";
        $newElements4[0]->type = Element::HEAD;
        $newElements4[0]->items[0]->theText = 'Test 4 Line 1';
        $updatedItemIds4 = $dm->updateColumnElements($pageId, 1, $newElements4);
        $updatedElements4 = $dm->getColumnElementsByPageId($pageId, 1);
        //print_r($updatedElements4);
        $this->assertCount($numElements, $updatedElements4);
        for ($i = 0; $i < $numElements; $i++) {
            $this->assertEquals($i, $updatedElements4[$i]->seq);
            $this->assertEquals($updatedItemIds4[$newElements4[$i]->items[0]->id], $updatedElements4[$i]->items[0]->id);
        }
        
        // TEST 5: More items per line, checking reported item ids
        //print "\n\n========== TEST 5 ===============\n\n";
        $originalElements5 = $updatedElements4;
        $givenItemId = -1000;
        $newElements5 = [];
        for ($i=0; $i<$numElements; $i++) { 
            $element = new Line();
            $element->id = $i+2000; // Irrelevant
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $reviewer4; 
            $element->lang = 'la';
            $element->handId = 0;
            $element->seq = $i;
            ItemArray::addItem($element->items, new Rubric($givenItemId--,0,"Test 5"));
            ItemArray::addItem($element->items, new Text($givenItemId--,1,": line". (string)($i+1)));
            ItemArray::setLang($element->items, 'la');
            ItemArray::setHandId($element->items, 0);
            $newElements5[] = $element;
        }
        //print "Editor Id: " . $reviewer4 . "\n";
        $updatedItemIds5 = $dm->updateColumnElements($pageId, 1, $newElements5);
        $updatedElements5 = $dm->getColumnElementsByPageId($pageId, 1);
        //print_r($newElements5);
        //print_r($updatedElements5);
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

