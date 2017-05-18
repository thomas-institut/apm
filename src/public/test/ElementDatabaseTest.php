<?php

/*
 * Copyright (C) 2017 Universität zu Köln
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

namespace AverroesProject;
require "../vendor/autoload.php";
require_once 'DatabaseTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\ItemArray;

/**
 * Description of ElementTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ElementDatabaseTest extends TestCase {
        /**
     *     
     * @var AverroesProject\Data\DataManager
     */
    static $dataManager;
    
    public static function setUpBeforeClass() {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('ELEMENT-TEST');
        $logger->pushHandler($logStream);
        self::$dataManager = DatabaseTestEnvironment::getDataManager($logger);
    }
    
    public function testEmptyDatabase()
    {
        $dm = self::$dataManager;
        DatabaseTestEnvironment::emptyDatabase();
        
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
        for ($i = 0; $i < $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editorId = $dm->um->createUserByUsername('testeditor');
        
        $goodElement = new ColumnElement\Line();
        $goodElement->id = 200; // this will be ignored!
        $goodElement->pageId = $dm->getPageIdByDocPage($docId, 1);
        $goodElement->columnNumber = 1;
        $goodElement->editorId = $editorId;
        $goodElement->handId = 0;
        // One of each item type, for good measure
        ItemArray::addItem($goodElement->items, new TxText\Text(0,-1,'Some text '));
        ItemArray::addItem($goodElement->items, new TxText\Rubric(0,-1,'Rubric '));
        ItemArray::addItem($goodElement->items, new TxText\Sic(0,-1,'loose', 'lose'));
        ItemArray::addItem($goodElement->items, new TxText\Mark(0,-1));
        ItemArray::addItem($goodElement->items, new TxText\Unclear(0, -1, 'unclear', 'Hey', 'Hey you'));
        ItemArray::addItem($goodElement->items, new TxText\Illegible(0,-1,5));
        ItemArray::addItem($goodElement->items, new TxText\Abbreviation(0,-1,'Mr.', 'Mister'));
        ItemArray::addItem($goodElement->items, new TxText\Gliph(0,-1,'ā'));
        ItemArray::addItem($goodElement->items, new TxText\Deletion(0,-1,'deleted', 'strikeout'));
        ItemArray::addItem($goodElement->items, new TxText\Addition(0,-1,'added', 'above'));
        ItemArray::addItem($goodElement->items, new TxText\NoWordBreak(0,-1));
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
        $newElement = $dm->insertNewElement($goodElement);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals(1, $newElement->seq);
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
        $editorId = $dm->um->createUserByUsername('testeditor2');
        $pageId =  $dm->getPageIdByDocPage($docId, 2);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new ColumnElement\Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editorId;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new TxText\Text(0,-1,"This is $i "));
            ItemArray::addItem($element->items, new TxText\Rubric(0,-1,'with rubric '));
            ItemArray::addItem($element->items, new TxText\Text(0,-1,'and more text '));
            ItemArray::addItem($element->items, new TxText\Abbreviation(0,-1,'LOL', 
                    'laughing out loud'));
            $newElement = $dm->insertNewElement($element);
            $this->assertNotFalse($newElement);
            $this->assertNotEquals(0, $newElement->id);
            $this->assertEquals($i+1, $newElement->seq);
            $this->assertCount(count($element->items), 
                    $newElement->items);
        }
        
        // Now elements with sequence
        
        // This will be inserted at the end
        $element->seq = $numElements+100;
        $newElement = $dm->insertNewElement($element, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals($numElements+1, $newElement->seq);
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
        $editorId = $dm->um->createUserByUsername('testeditor3');
        $pageId =  $dm->getPageIdByDocPage($docId, 3);
        
        for ($i=0; $i<$numElements; $i++) {
            $element = new ColumnElement\Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editorId;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new TxText\Text(0,-1,"This is $i "));
            ItemArray::addItem($element->items, new TxText\Rubric(0,-1,'with rubric '));
            ItemArray::addItem($element->items, new TxText\Text(0,-1,'and more text '));
            ItemArray::addItem($element->items, new TxText\Abbreviation(0,-1,'LOL', 
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
        for ($i = 0; $i < $numPages; $i++) {
            $dm->addNewColumn($docId, $i);
        }
        $editorId = $dm->um->createUserByUsername('testeditor4');
        $pageId =  $dm->getPageIdByDocPage($docId, 1);
        
        $elementIds = [];
        for ($i=0; $i<$numElements; $i++) {
            $element = new ColumnElement\Line();
            $element->pageId = $pageId;
            $element->columnNumber = 1;
            $element->editorId = $editorId;
            $element->lang = 'la';
            $element->handId = 0;
            ItemArray::addItem($element->items, new TxText\Rubric(0,0,"Hello "));
            ItemArray::addItem($element->items, new TxText\Text(0,1,'darkness '));
            ItemArray::addItem($element->items, new TxText\Text(0,2,'my '));
            ItemArray::addItem($element->items, new TxText\Abbreviation(0,3,'f. ', 
                    'friend'));
            $elementIds[] = $dm->insertNewElement($element)->id;
        }
        
        // No changes
        $testElementId = $elementIds[0];
        $currentElement = $dm->getElementById($testElementId);

        $newVersion = clone $currentElement;
        $newVersion->items = [];
        ItemArray::addItem($newVersion->items, new TxText\Rubric(0,-1,"Hello "));
        ItemArray::addItem($newVersion->items, new TxText\Text(0,-1,'darkness '));
        ItemArray::addItem($newVersion->items, new TxText\Text(0,-1,'my '));
        ItemArray::addItem($newVersion->items, new TxText\Abbreviation(0,-1,'f. ', 
                'friend'));
        ItemArray::setLang($newVersion->items, 'la');
        ItemArray::setHandId($newVersion->items, 0);
        
        
        $id = $dm->updateElement($newVersion, $currentElement);
        $this->assertEquals($testElementId, $id);
        $updatedElement = $dm->getElementById($id);
        $this->assertTrue(Element::isElementDataEqual($updatedElement, 
                $currentElement));
        for ($i=0; $i < count($currentElement->items); $i++)  {
            $this->assertEquals(
                $currentElement->items[$i]->id,
                $updatedElement->items[$i]->id
            );
        }
        
        // Even if the id of the new element is different, there should
        // not be any real update to the DB if the data is the same
        $testElementId2 = $elementIds[1];
        $currentElement2 = $dm->getElementById($testElementId2);

        $newVersion2 = clone $currentElement2;
        $newVersion2->id = 0;
        $newVersion2->items = [];
        ItemArray::addItem($newVersion2->items, new TxText\Rubric(0,-1,"Hello "));
        ItemArray::addItem($newVersion2->items, new TxText\Text(0,-1,'darkness '));
        ItemArray::addItem($newVersion2->items, new TxText\Text(0,-1,'my '));
        ItemArray::addItem($newVersion2->items, new TxText\Abbreviation(0,-1,'f. ', 
                'friend'));
        ItemArray::setLang($newVersion2->items, 'la');
        ItemArray::setHandId($newVersion2->items, 0);
        
        $id2 = $dm->updateElement($newVersion2, $currentElement2);
        $this->assertEquals($testElementId2, $id2);
        $updatedElement2 = $dm->getElementById($id2);
        $this->assertTrue(Element::isElementDataEqual($updatedElement2, 
                $currentElement2));
        for ($i=0; $i < count($currentElement2->items); $i++)  {
            $this->assertEquals(
                $currentElement2->items[$i]->id,
                $updatedElement2->items[$i]->id
            );
        }
        
        // Change in the element's data
        $testElementId3 = $elementIds[2];
        $currentElement3 = $dm->getElementById($testElementId3);

        $newVersion3 = clone $currentElement3;
        $newVersion3->type = Element::HEAD;
        $newVersion3->items = [];
        ItemArray::addItem($newVersion3->items, new TxText\Rubric(0,-1,"Hello "));
        ItemArray::addItem($newVersion3->items, new TxText\Text(0,-1,'darkness '));
        ItemArray::addItem($newVersion3->items, new TxText\Text(0,-1,'my '));
        ItemArray::addItem($newVersion3->items, new TxText\Abbreviation(0,-1,'f. ', 
                'friend'));
        ItemArray::setLang($newVersion3->items, 'la');
        ItemArray::setHandId($newVersion3->items, 0);
        
        $id3 = $dm->updateElement($newVersion3, $currentElement3);
        $this->assertEquals($testElementId3, $id3);
        $updatedElement3 = $dm->getElementById($id3);
        for ($i=0; $i < count($currentElement3->items); $i++)  {
            $this->assertEquals(
                $currentElement3->items[$i]->id,
                $updatedElement3->items[$i]->id
            );
        }
        
        // Two items in switched position
        $testElementId4 = $elementIds[3];
        $currentElement4 = $dm->getElementById($testElementId4);

        $newVersion4 = clone $currentElement4;
        $newVersion4->items = [];
        ItemArray::addItem($newVersion4->items, new TxText\Rubric(0,-1,"Hello "));
        ItemArray::addItem($newVersion4->items, new TxText\Text(0,-1,'my '));
        ItemArray::addItem($newVersion4->items, new TxText\Text(0,-1,'darkness '));
        ItemArray::addItem($newVersion4->items, new TxText\Abbreviation(0,-1,'f. ', 
                'friend'));
        ItemArray::setLang($newVersion4->items, 'la');
        ItemArray::setHandId($newVersion4->items, 0);
        
        $id4 = $dm->updateElement($newVersion4, $currentElement4);
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
    }
}

