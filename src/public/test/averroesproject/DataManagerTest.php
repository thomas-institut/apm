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
require_once 'SiteMockup/DatabaseTestEnvironment.php';

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
use AverroesProject\Plugin\HookManager;
use AverroesProject\ItemStream\ItemStream;

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
        $hm = new HookManager();
        self::$dataManager = DatabaseTestEnvironment::getDataManager($logger, $hm);
    }
    
    
    public function testEmptyDatabase() 
    {
        $dm = self::$dataManager;
        DatabaseTestEnvironment::emptyDatabase();
        
        // No docs at this point
        $this->assertEquals(0, $dm->getPageCountByDocId(100));
        $this->assertFalse($dm->getPageInfoByDocPage(100, 200));
        $this->assertFalse($dm->getElementById(1000));
        $this->assertEquals([], $dm->getEditorsByDocId(100));
        $this->assertEquals([], $dm->getTranscribedPageListByDocId(100));
        $this->assertFalse($dm->getImageUrl(100, 100));
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
        $this->assertCount(0, $dm->getTranscribedPageListByDocId($newDocId));
        $pageInfo = $dm->getPageInfoByDocPage($newDocId, 10);
        $this->assertNotFalse($pageInfo);
        $this->assertTrue($dm->isPageEmpty($pageInfo['id']));
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
        $this->assertEquals(2, $nCols);
        $pageId = $dm->getPageIdByDocPage($docId, 1);
        $this->assertNotFalse($pageId);
        $this->assertTrue($dm->isPageEmpty($pageId));
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
        
        return $docId;
    }
    
    /**
     * @depends testUpdateColumn
     */
    public function testUpdatePageSettings ($docId)
    {
        $dm = self::$dataManager;
        $types = $dm->getPageTypeNames();
        $this->assertNotFalse($types);

        $pageId = $dm->getPageIdByDocPage($docId, 1);
        $initialSettings = $dm->getPageInfo($pageId);
        
        $this->assertEquals(1, $initialSettings['id']);
        $this->assertEquals(0, $initialSettings['type']);
        $this->assertEquals('la', $initialSettings['lang']);
        $this->assertEquals(NULL, $initialSettings['foliation']);
        $this->assertEquals(2,$initialSettings['num_cols'] );
        
        $res1 = $dm->updatePageSettings($pageId, []);
        $this->assertFalse($res1);
        
        // Bad Settings, including dangerous ones like 'num_cols'
        $badSettings = ['notassetting', 'num_cols', 'doc_id', 'id', 'page_number', 'valid_from', 'valid_until'];
        foreach ($badSettings as $badSetting) {
            $res2 = $dm->updatePageSettings($pageId, [ $badSetting => 100]);
            $this->assertTrue($res2);
            $curSettings2 = $dm->getPageInfo($pageId);
            $this->assertEquals($initialSettings, $curSettings2);
        }
        
        $res3 = $dm->updatePageSettings($pageId, ['foliation' => '119r']);
        $this->assertTrue($res3);
        $curSettings3 = $dm->getPageInfo($pageId);
        $this->assertEquals($initialSettings['lang'], $curSettings3['lang']);
        $this->assertEquals($initialSettings['type'], $curSettings3['type']);
        $this->assertEquals('119r', $curSettings3['foliation']);
       
        $res4 = $dm->updatePageSettings($pageId, ['foliation' => '']);
        $this->assertTrue($res4);
        $curSettings4 = $dm->getPageInfo($pageId);
        $this->assertEquals($initialSettings['lang'], $curSettings4['lang']);
        $this->assertEquals($initialSettings['type'], $curSettings4['type']);
        $this->assertEquals(NULL, $curSettings4['foliation']);
        
        $res5 = $dm->updatePageSettings($pageId, ['lang' => 'he']);
        $this->assertTrue($res5);
        $curSettings5 = $dm->getPageInfo($pageId);
        $this->assertEquals('he', $curSettings5['lang']);
        $this->assertEquals($initialSettings['type'], $curSettings5['type']);
        $this->assertEquals(NULL, $curSettings5['foliation']);
        
        // type not valid!
        $res6 = $dm->updatePageSettings($pageId, ['type' => 25]);
        $this->assertFalse($res6);
        $curSettings6 = $dm->getPageInfo($pageId);
        $this->assertEquals($curSettings5, $curSettings6);
        
        // good type!
        $res7 = $dm->updatePageSettings($pageId, ['type' => 3]);
        $this->assertTrue($res7);
        $curSettings7 = $dm->getPageInfo($pageId);
        $this->assertEquals('he', $curSettings7['lang']);
        $this->assertEquals(3, $curSettings7['type']);
        $this->assertEquals(NULL, $curSettings7['foliation']);
        
        // Two things at once
        $res8 = $dm->updatePageSettings($pageId, ['type' => 2, 'foliation' => '120r']);
        $this->assertTrue($res8);
        $curSettings8 = $dm->getPageInfo($pageId);
        $this->assertEquals('he', $curSettings8['lang']);
        $this->assertEquals(2, $curSettings8['type']);
        $this->assertEquals('120r', $curSettings8['foliation']);
        
        return $docId;
    }
    
     /**
     * @depends testUpdatePageSettings
     */
    public function testDeletePage($docId) 
    {
        $dm = self::$dataManager;
        $res = $dm->deletePage($docId, 1);
        $this->assertFalse($res);
        $testPageCount = 100;
        
        $newDocId = $dm->newDoc('Document 2', 'Doc 1', $testPageCount, 'la', 
                'mss', 'local', 'DOC2');
        
        $this->assertNotFalse($newDocId);
        $this->assertEquals($testPageCount, $dm->getPageCountByDocId($newDocId));
        
        $originalPageIds = [];
        for ($i=0; $i < $testPageCount; $i++) {
            $originalPageIds[] = $dm->getPageIdByDocPage($newDocId, $i+1);
        }
        
        $pageToDelete = random_int(1, $testPageCount);
        $pageToDeleteId = $dm->getPageIdByDocPage($newDocId, $pageToDelete);
        $this->assertContains($pageToDeleteId, $originalPageIds);
        
        $dm->deletePage($newDocId, $pageToDelete);
        $this->assertFalse($dm->getPageInfo($pageToDeleteId));
        $this->assertEquals($testPageCount-1, $dm->getPageCountByDocId($newDocId));
        
        $sequences = [];
        for ($i=0; $i < $testPageCount-1; $i++) {
            $pageId = $dm->getPageIdByDocPage($newDocId, $i+1);
            $this->assertNotEquals($pageToDeleteId, $pageId);
            $pageInfo = $dm->getPageInfo($pageId);
            $this->assertLessThan($testPageCount, $pageInfo['seq']);
            $sequences[] = $pageInfo['seq'];
        }
        
        for ($i = 1; $i < $testPageCount; $i++) {
            $this->assertContains($i, $sequences);
        }
        
    }
    
    public function testGetItemStream()
    {
        
        $dm = self::$dataManager;
        $testPageCount = 10;
      
        // Create document
        $docId = $dm->newDoc('Document 3', 'Doc 3', $testPageCount, 'la', 
                'mss', 'local', 'DOC3');
        
        $this->assertNotFalse($docId);
        $this->assertEquals($testPageCount, $dm->getPageCountByDocId($docId));
        
        // Add columns
        for ($i = 0; $i < $testPageCount; $i++) {
            $this->assertNotFalse($dm->addNewColumn($docId, $i+1));
            $this->assertEquals(1, $dm->getNumColumns($docId, $i+1));
        }
        
        // Create an editor user id
        $editor = $dm->um->createUserByUserName('testeditor');
        
        // Test case 1: simple item array, no references
        
        $testCase1Array = [
          [ 'type' => TxText\Item::TEXT, 'text' => 'One'],
          [ 'type' => TxText\Item::TEXT, 'text' => "\n"],
          [ 'type' => TxText\Item::RUBRIC, 'text' => 'Two'],
          [ 'type' => TxText\Item::TEXT, 'text' => "\n"],
          [ 'type' => TxText\Item::TEXT, 'text' => 'Three'],
          [ 'type' => TxText\Item::TEXT, 'text' => "\n"],
          [ 'type' => TxText\Item::SIC, 'text' => 'Four'],
          [ 'type' => TxText\Item::TEXT, 'text' => "\n"],
          [ 'type' => TxText\Item::TEXT, 'text' => "Five"],
          [ 'type' => TxText\Item::TEXT, 'text' => "\n"],
        ];
        
        
        $mainTextElement = new Line();
        $mainTextElement->lang = 'la';
        $mainTextElement->handId = 0;
        $mainTextElement->editorId = $editor;
        $itemId = 100;
        $itemSeq = 0;
        foreach($testCase1Array as $itemDef) {
            switch ($itemDef['type']) {
                case TxText\Item::TEXT:
                    $item = new Text($itemId++, $itemSeq++, $itemDef['text']);
                    break;
                
                case TxText\Item::RUBRIC: 
                    $item = new TxText\Rubric($itemId++, $itemSeq++, $itemDef['text']);
                    break;
                
                case TxText\Item::SIC: 
                    $item = new TxText\Sic($itemId++, $itemSeq++, $itemDef['text']);
                    break;
            }
            ItemArray::addItem($mainTextElement->items, $item);
        }
        ItemArray::setHandId($mainTextElement->items, 0);
        ItemArray::setLang($mainTextElement->items, 'la');
        $newElements = [];
        $newElements[] = $mainTextElement;  
        $pageId = $dm->getPageIdByDocPage($docId, 1);
        $dm->updateColumnElements($pageId, 1, $newElements);
        
        // $loc1 with col=0 so that ALL items in the column are included
        $loc1 = [ 'page_seq' => 1, 'column_number' => 0, 'e_seq' => 0, 'item_seq' => 0];
        $loc2 = [ 'page_seq' => 1, 'column_number' => 1, 'e_seq' => 9999, 'item_seq' => 9999];
        $itemStream1 = $dm->getItemStreamBetweenLocations($docId, $loc1, $loc2);
        
        $this->assertCount(count($testCase1Array), $itemStream1);
        for ($i = 0; $i < count($itemStream1); $i++) {
            $this->assertEquals($testCase1Array[$i]['type'], $itemStream1[$i]['type']);
            $this->assertEquals($testCase1Array[$i]['text'], $itemStream1[$i]['text']);
        }
        
        
        // TEST CASE 2: a deletion, some text and an addition with target the deletion
        
        $mainTextElement2 = new Line();
        $mainTextElement2->lang = 'la';
        $mainTextElement2->handId = 0;
        $mainTextElement2->editorId = $editor;
        ItemArray::addItem($mainTextElement2->items, new Deletion(100, 0, 'deletion', 'strikeout'));
        ItemArray::addItem($mainTextElement2->items, new Text(101, 1, 'some text'));
        ItemArray::addItem($mainTextElement2->items, new TxText\Addition(102, 2, 'addition', 'above', 100));
        ItemArray::addItem($mainTextElement2->items, new Text(103, 3, 'another text'));
        ItemArray::setHandId($mainTextElement2->items, 0);
        ItemArray::setLang($mainTextElement2->items, 'la');
        $newElements2 = [];
        $newElements2[] = $mainTextElement2;  
        $pageId = $dm->getPageIdByDocPage($docId, 2);
        $dm->updateColumnElements($pageId, 1, $newElements2);
        // $loc1 with col=0 so that ALL items in the column are included
        $loc1 = [ 'page_seq' => 2, 'column_number' => 0, 'e_seq' => 0, 'item_seq' => 0];
        $loc2 = [ 'page_seq' => 2, 'column_number' => 1, 'e_seq' => 9999, 'item_seq' => 9999];
        $itemStream2 = $dm->getItemStreamBetweenLocations($docId, $loc1, $loc2);
        
        $this->assertCount(4, $itemStream2);
        $this->assertEquals(TxText\Item::DELETION, $itemStream2[0]['type']);
        $this->assertEquals(TxText\Item::ADDITION, $itemStream2[1]['type']);
        $this->assertEquals(TxText\Item::TEXT, $itemStream2[2]['type']);
        $this->assertEquals(TxText\Item::TEXT, $itemStream2[3]['type']);
        
        
        // TEST CASE 3: some text, a mark and a marginal addition
        $mainTextElement3 = new Line();
        $mainTextElement3->lang = 'la';
        $mainTextElement3->handId = 0;
        $mainTextElement3->editorId = $editor;
        ItemArray::addItem($mainTextElement3->items, new Text(100, 0, 'Some text.'));
        ItemArray::addItem($mainTextElement3->items, new TxText\MarginalMark(101, 1, '[A]'));
        ItemArray::addItem($mainTextElement3->items, new Text(102, 2, ' More text.'));
        ItemArray::setHandId($mainTextElement3->items, 0);
        ItemArray::setLang($mainTextElement3->items, 'la');
        
        $marginalElement = new ColumnElement\Substitution();
        $marginalElement->reference = 101;
        $marginalElement->lang = 'la';
        $marginalElement->handId = 0;
        $marginalElement->editorId = $editor;
        ItemArray::addItem($marginalElement->items, new Text(105, 0, 'Marginal text.'));
        $newElements3 = [];
        $newElements3[] = $mainTextElement3;
        $newElements3[] = $marginalElement;
        $pageId = $dm->getPageIdByDocPage($docId, 3);
        $dm->updateColumnElements($pageId, 1, $newElements3);
        // $loc1 with col=0 so that ALL items in the column are included
        $loc1 = [ 'page_seq' => 3, 'column_number' => 0, 'e_seq' => 0, 'item_seq' => 0];
        $loc2 = [ 'page_seq' => 3, 'column_number' => 1, 'e_seq' => 9999, 'item_seq' => 9999];
        $itemStream3 = $dm->getItemStreamBetweenLocations($docId, $loc1, $loc2);
        $this->assertCount(4, $itemStream3);
        $this->assertEquals(TxText\Item::TEXT, $itemStream3[0]['type']);
        $this->assertEquals(TxText\Item::MARGINAL_MARK, $itemStream3[1]['type']);
        $this->assertEquals(TxText\Item::TEXT, $itemStream3[2]['type']);
        $this->assertEquals('Marginal text.', $itemStream3[2]['text']);
        $this->assertEquals(TxText\Item::TEXT, $itemStream3[3]['type']);
        
        $plainText = ItemStream::getPlainText($itemStream3);
        
        $this->assertEquals('Some text. Marginal text. More text.', $plainText);
        
    }
    
    
    public function testGetChunkLocations() 
    {
        $dm = self::$dataManager;
        
        $locs = [];
        
        $result0 = $dm->getChunkLocationArrayFromRawLocations($locs);
        $this->assertCount(0, $result0);
        
        $locs[0] = [ 
            'page_seq' => 10, 
            'foliation' => '20r',
            'column_number' => 1,
            'e_seq' => 0, 
            'item_seq' => 0, 
            'type' => 'start',
            'segment' => 1
            ];
        
        $result1 = $dm->getChunkLocationArrayFromRawLocations($locs);
        
        $this->assertCount(1, $result1);
        $this->assertFalse($result1[1]['valid']);
        
        $locs[1] = [ 
            'page_seq' => 20, 
            'foliation' => '15r',
            'column_number' => 1,
            'e_seq' => 0, 
            'item_seq' => 0, 
            'type' => 'end',
            'segment' => 1
            ];
        
        
        
        $result2 = $dm->getChunkLocationArrayFromRawLocations($locs);
        
        $this->assertCount(1, $result2);
        $this->assertTrue($result2[1]['valid']);
        $this->assertArrayHasKey('start', $result2[1]);
        $this->assertArrayHasKey('end', $result2[1]);
        $this->assertEquals($locs[0], $result2[1]['start']);
        $this->assertEquals($locs[1], $result2[1]['end']);
        
        
        $locs[1] = [ 
            'page_seq' => 5, 
            'foliation' => '15r',
            'column_number' => 1,
            'e_seq' => 0, 
            'item_seq' => 0, 
            'type' => 'end',
            'segment' => 1
            ];
        
        $result3 = $dm->getChunkLocationArrayFromRawLocations($locs);
        $this->assertCount(1, $result3);
        $this->assertFalse($result3[1]['valid']);

        $locs[1] = [ 
            'page_seq' => 20, 
            'foliation' => '15r',
            'column_number' => 1,
            'e_seq' => 0, 
            'item_seq' => 0, 
            'type' => 'end',
            'segment' => 1
            ];
        
        $locs[2] = [ 
            'page_seq' => 40, 
            'foliation' => '15r',
            'column_number' => 1,
            'e_seq' => 0, 
            'item_seq' => 0, 
            'type' => 'end',
            'segment' => 2
            ];
        
        $locs[3] = [ 
            'page_seq' => 30, 
            'foliation' => '15r',
            'column_number' => 1,
            'e_seq' => 0, 
            'item_seq' => 0, 
            'type' => 'start',
            'segment' => 2
            ];
        
        $result4 = $dm->getChunkLocationArrayFromRawLocations($locs);
        
        $this->assertCount(2, $result4);
        $this->assertTrue($result4[1]['valid']);
        $this->assertTrue($result4[2]['valid']);
        $this->assertArrayHasKey('start', $result4[1]);
        $this->assertArrayHasKey('end', $result4[1]);
        $this->assertArrayHasKey('start', $result4[2]);
        $this->assertArrayHasKey('end', $result4[2]);
        $this->assertEquals($locs[0], $result4[1]['start']);
        $this->assertEquals($locs[1], $result4[1]['end']);
        $this->assertEquals($locs[3], $result4[2]['start']);
        $this->assertEquals($locs[2], $result4[2]['end']);
    }
}