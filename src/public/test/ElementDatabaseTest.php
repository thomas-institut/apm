<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
require "../vendor/autoload.php";
require_once 'DatabaseTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use AverroesProject\Data\DataManager;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

/**
 * Description of ElementTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ElementDatabaseTest extends TestCase {
        /**
     *     
     * @var Data\DataManager
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
        // One of each item type, for good measure
        $goodElement->items->addItem(new TxText\Text(0,1,'Some text '));
        $goodElement->items->addItem(new TxText\Rubric(0,2,'Rubric '));
        $goodElement->items->addItem(new TxText\Sic(0,3,'loose', 'lose'));
        $goodElement->items->addItem(new TxText\Mark(0,4));
        $goodElement->items->addItem(new TxText\Unclear(0, 5, 'unclear', 'Hey', 'Hey you'));
        $goodElement->items->addItem(new TxText\Illegible(0,6,5));
        $goodElement->items->addItem(new TxText\Abbreviation(0,7,'Mr.', 'Mister'));
        $goodElement->items->addItem(new TxText\Gliph(0,8,'ā'));
        $goodElement->items->addItem(new TxText\Deletion(0,9,'deleted', 'strikeout'));
        $goodElement->items->addItem(new TxText\Addition(0,10,'added', 'above'));
        $goodElement->items->addItem(new TxText\NoLinebreak(0,11));
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
        $element->items = new TxText\ItemArray();
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
        //$this->assertNotEquals($goodElement->timestamp, $newElement->timestamp);
        $this->assertEquals(1, $newElement->seq);
        $this->assertEquals($goodElement->items->nItems(), 
                $newElement->items->nItems());
        
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
            $element->items->addItem(new TxText\Text(0,1,"This is $i "));
            $element->items->addItem(new TxText\Rubric(0,2,'with rubric '));
            $element->items->addItem(new TxText\Text(0,3,'and more text '));
            $element->items->addItem(new TxText\Abbreviation(0,3,'LOL', 
                    'laughing out loud'));
            $newElement = $dm->insertNewElement($element);
            $this->assertNotFalse($newElement);
            $this->assertNotEquals(0, $newElement->id);
            $this->assertEquals($i+1, $newElement->seq);
            $this->assertEquals($element->items->nItems(), 
                    $newElement->items->nItems());
        }
        
        // Now elements with sequence
        
        // This will be inserted at the end
        $element->seq = $numElements+100;
        $newElement = $dm->insertNewElement($element, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals($numElements+1, $newElement->seq);
        $this->assertEquals($element->items->nItems(), 
                    $newElement->items->nItems());
        
        // This will be inserted as the first element in the column
        $element->seq = 1;
        $newElement = $dm->insertNewElement($element, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals(1, $newElement->seq);
        $this->assertEquals($element->items->nItems(), 
                    $newElement->items->nItems());
        
        
                    
        $element->seq = $numElements;
        $newElement = $dm->insertNewElement($element, false);
        $this->assertNotFalse($newElement);
        $this->assertNotEquals(0, $newElement->id);
        $this->assertEquals($numElements, $newElement->seq);
        $this->assertEquals($element->items->nItems(), 
                    $newElement->items->nItems());

    }
    
    
}
