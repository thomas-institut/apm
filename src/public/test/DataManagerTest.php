<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */
namespace AverroesProject;
require "../vendor/autoload.php";
require_once 'DatabaseTestEnvironment.php';

use PHPUnit\Framework\TestCase;
use AverroesProject\Data\DataManager;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Element;
use AverroesProject\ColumnElement\Line;
use AverroesProject\TxText\Text;
use AverroesProject\ColumnElement\Addition;
use AverroesProject\TxText\Deletion;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

/**
 * Description of testApi
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DataManagerTest extends TestCase {
    
    /**
     *     
     * @var Data\DataManager
     */
    static $dataManager;
    
    public static function setUpBeforeClass() {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('DM-TEST');
        $logger->pushHandler($logStream);
        self::$dataManager = DatabaseTestEnvironment::getDataManager($logger);
    }
    
    
    public function testEmptyDatabase() 
    {
        $dm = self::$dataManager;
        DatabaseTestEnvironment::emptyDatabase();
        
        // No docs at this point
        $this->assertEquals(0, $dm->getPageCountByDocId(100));
        $this->assertFalse($dm->getPageInfoByDocPage(100, 200));
        $this->assertFalse($dm->getElementById(1000));
        $this->assertEquals(0, $dm->getLineCountByDoc(100));
        $this->assertEquals([], $dm->getEditorsByDocId(100));
        $this->assertEquals([], $dm->getPageListByDocId(100));
        $this->assertFalse($dm->getImageUrlByDocId(100, 200));
        $this->assertEquals(0, $dm->getNumColumns(100, 200));
        $this->assertEquals([], $dm->getDocIdList());
        $this->assertEquals([], $dm->getDocIdList('title'));
    }
    
    /**
     * 
     * @depends testEmptyDatabase
     */
    public function testNewDoc()
    {
        $dm = self::$dataManager;
        
        $newDocId = $dm->newDoc('Document 1', 'Doc 1', 10, 'la', 
                'mss', 'local', 'DOC1');
        
        $this->assertNotFalse($newDocId);
        $this->assertEquals([$newDocId], $dm->getDocIdList());
        $this->assertEquals([$newDocId], $dm->getDocIdList('title'));
        $this->assertEquals(10, $dm->getPageCountByDocId($newDocId));
        $this->assertCount(0, $dm->getPageListByDocId($newDocId));
        $pageInfo = $dm->getPageInfoByDocPage($newDocId, 10);
        $this->assertNotFalse($pageInfo);
        $this->assertEquals(0, $pageInfo['num_cols']);
        $this->assertEquals('la', $pageInfo['lang']);
        $this->assertNull($pageInfo['foliation']);
        return $newDocId;
    }
    
    /**
     * @depends testNewDoc
     */
    public function testColumns($docId)
    {
        $dm = self::$dataManager;
        $nCols = $dm->getNumColumns($docId, 1);
        $this->assertEquals(0, $nCols);
        
        $this->assertNotFalse($dm->addNewColumn($docId, 1));
        $this->assertEquals(1, $dm->getNumColumns($docId, 1));
        $this->assertNotFalse($dm->addNewColumn($docId, 1));
        $this->assertEquals(2, $dm->getNumColumns($docId, 1));
        
        return $docId;
    }
    
    /**
     * 
     * @depends testColumns
     */
    public function testUpdateColumn($docId) {
        $dm = self::$dataManager;
        $nCols = $dm->getNumColumns($docId, 1);
        $pageId = $dm->getPageIdByDocPage($docId, 1);
        $this->assertNotFalse($pageId);
        $editor1 = $dm->um->createUserByUserName('testeditor1');
        
        $lineElement = new Line();
        $lineElement->lang = 'la';
        $lineElement->handId = 0;
        $lineElement->editorId = $editor1;

        ItemArray::addItem($lineElement->items, new Text(100, 0, 'sometext'));
        ItemArray::addItem($lineElement->items, new Deletion(101, 1, 'deleted', 'strikeout'));
        ItemArray::addItem($lineElement->items, new TxText\Addition(102, 2, 'added', 'above', 101));
        ItemArray::setHandId($lineElement->items, 0);
        ItemArray::setLang($lineElement->items, 'la');
        $newElements = [];
        $newElements[] = $lineElement;        
        
        $newItemIds = $dm->updateColumnElements($pageId, 1, $newElements); 
        
        $this->assertNotFalse($newItemIds);
        $this->assertCount(3, $newItemIds);
        
        $updatedElements = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertNotFalse($updatedElements);
        $this->assertCount(1, $updatedElements);
        $element1 = $updatedElements[0];
        $this->assertCount(3, $element1->items);
        $this->assertEquals($newItemIds[100], $element1->items[0]->id);
        $this->assertEquals($newItemIds[101], $element1->items[1]->id);
        $this->assertEquals($newItemIds[102], $element1->items[2]->id);
        $this->assertEquals($newItemIds[101], $element1->items[2]->target);
        
        // Add another "mod" 
        ItemArray::addItem($lineElement->items, new Deletion(103, 3, 'deleted2', 'strikeout'));
        ItemArray::addItem($lineElement->items, new TxText\Addition(104, 4, 'added2', 'above', 103));
        ItemArray::setHandId($lineElement->items, 0);
        ItemArray::setLang($lineElement->items, 'la');
        $newItemIds = $dm->updateColumnElements($pageId, 1, $newElements); 
        
        $this->assertNotFalse($newItemIds);
        $this->assertCount(5, $newItemIds);
        
        $updatedElements = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertNotFalse($updatedElements);
        $this->assertCount(1, $updatedElements);
        $element1 = $updatedElements[0];
        $this->assertCount(5, $element1->items);
        $this->assertEquals($newItemIds[100], $element1->items[0]->id);
        $this->assertEquals($newItemIds[101], $element1->items[1]->id);
        $this->assertEquals($newItemIds[102], $element1->items[2]->id);
        $this->assertEquals($newItemIds[103], $element1->items[3]->id);
        $this->assertEquals($newItemIds[104], $element1->items[4]->id);
        $this->assertEquals($newItemIds[103], $element1->items[4]->target);
        
        // Add another deletion and a new element with an addition pointing to it
        ItemArray::addItem($lineElement->items, new Deletion(105, 5, 'deleted3', 'strikeout'));
        ItemArray::setHandId($lineElement->items, 0);
        ItemArray::setLang($lineElement->items, 'la');
        $lineElement2 = new Line();
        $lineElement2->lang = 'la';
        $lineElement2->handId = 0;
        $lineElement2->editorId = $editor1;

        ItemArray::addItem($lineElement2->items, new Text(106, 0, 'sometext2'));
        ItemArray::addItem($lineElement2->items, new TxText\Addition(107, 1, 'added3', 'above', 105));
        ItemArray::setHandId($lineElement2->items, 0);
        ItemArray::setLang($lineElement2->items, 'la');
        $newElements = [];
        $newElements[] = $lineElement;
        $newElements[] = $lineElement2;
        
        $newItemIds = $dm->updateColumnElements($pageId, 1, $newElements); 
        
        $this->assertNotFalse($newItemIds);
        $this->assertCount(8, $newItemIds);
        
        $updatedElements = $dm->getColumnElementsByPageId($pageId, 1);
        $this->assertNotFalse($updatedElements);
        $this->assertCount(2, $updatedElements);
        $element1 = $updatedElements[0];
        $this->assertCount(6, $element1->items);
        $element2 = $updatedElements[1];
        $this->assertCount(2, $element2->items);
        $this->assertEquals($newItemIds[100], $element1->items[0]->id); // TEXT
        $this->assertEquals($newItemIds[101], $element1->items[1]->id); // DEL 1
        $this->assertEquals($newItemIds[102], $element1->items[2]->id); // ADD 1
        $this->assertEquals($newItemIds[103], $element1->items[3]->id); // DEL 2
        $this->assertEquals($newItemIds[104], $element1->items[4]->id); // ADD 2
        $this->assertEquals($newItemIds[105], $element1->items[5]->id); // DEL 3
        $this->assertEquals($newItemIds[106], $element2->items[0]->id); // TEXT
        $this->assertEquals($newItemIds[107], $element2->items[1]->id); // ADD 3
        
        $this->assertEquals($newItemIds[101], $element1->items[2]->target);
        $this->assertEquals($newItemIds[103], $element1->items[4]->target);
        $this->assertEquals($newItemIds[105], $element2->items[1]->target);
    }
    
}
