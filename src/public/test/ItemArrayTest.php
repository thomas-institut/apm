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

use PHPUnit\Framework\TestCase;
use AverroesProject\TxText\Item;
use AverroesProject\TxText\ItemArray;
use AverroesProject\TxText\Text;
use AverroesProject\TxText\Rubric;
use AverroesProject\TxText\Abbreviation;
/**
 * Description of ItemArrayTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemArrayTest extends TestCase
{
    
    public function testAddBadItem()
    {
        $ia = [];
        $this->expectException(\InvalidArgumentException::class);
        ItemArray::addItem($ia, new ColumnElement\Line());
    }

    public function testAddBadItem2()
    {
        $ia = [];
        $this->expectException(\InvalidArgumentException::class);
        ItemArray::addItem($ia, "somestring");
    }
    
    public function testAddItemsWithSequence()
    {
        $ia = [];
        
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, $i+1, "Text" + $i);
            ItemArray::addItem($ia, $item);
            $this->assertSame($item, $ia[$i]);
        }
        $this->assertCount(10, $ia);
    }
    
    public function testAddItemsWithoutSequence()
    {
        $ia = [];
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, -1, "Text" + $i);
            ItemArray::addItem($ia, $item);
            $this->assertSame($item, $ia[$i]);
            
        }
        $this->assertCount(10, $ia);
    }
    
    public function testAddToObject()
    {
        $line = new ColumnElement\Line();
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, -1, "Text" + $i);
            ItemArray::addItem($line->items, $item);
            $this->assertSame($item, $line->items[$i]);
        }
        $this->assertCount(10, $line->items);
        
        
        
    }
    
    public function testAddOrderedItems()
    {
       $ia = [];
        
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, $i+1000, "Text" + $i + '-');
            ItemArray::addItem($ia, $item, true);
            $this->assertSame($item, $ia[$i]);
        }
        $this->assertCount(10, $ia);
        
        return $ia;
    }
    
    /**
     * @depends testAddOrderedItems
     */
    public function testSetLang($ia) 
    {
        foreach($ia as $item) {
            $this->assertEquals(Item::LANG_NOT_SET, $item->lang);
        }
        ItemArray::setLang($ia, 'la');
        foreach($ia as $item) {
            $this->assertEquals('la', $item->lang);
        }
        
        ItemArray::setLang($ia, 'he');
        foreach($ia as $item) {
            $this->assertEquals('la', $item->lang);
        }
        
        ItemArray::setLang($ia, 'he', true);
        foreach($ia as $item) {
            $this->assertEquals('he', $item->lang);
        }
    }
    
    /**
     * @depends testAddOrderedItems
     */
    public function testSetHandId($ia) 
    {
        foreach($ia as $item) {
            $this->assertEquals(Item::ID_NOT_SET, $item->handId);
        }
        ItemArray::setHandId($ia, 20);
        foreach($ia as $item) {
            $this->assertEquals(20, $item->handId);
        }
        
        ItemArray::setHandId($ia, 30);
        foreach($ia as $item) {
            $this->assertEquals(20, $item->handId);
        }
        
        ItemArray::setHandId($ia, 30, true);
        foreach($ia as $item) {
            $this->assertEquals(30, $item->handId);
        }
    }
    
    public function testGetText() 
    {
       $ia = [];
        
        ItemArray::addItem($ia, new TxText\Text(100, Item::SEQ_NOT_SET, "Hello "));
        ItemArray::addItem($ia, new TxText\Text(101, Item::SEQ_NOT_SET, "World"));
        
        $text = ItemArray::getText($ia);
        $this->assertEquals('Hello World', $text);
    }
    
    /**
     * @todo Make a more sensible test here!
     * @depends testAddOrderedItems
     */
    public function testSetCElementId($ia)
    {
        foreach($ia as $item) {
            $item->setColumnElementId(200);
        }
        
        foreach($ia as $item) {
            $this->assertEquals(200, $item->columnElementId);
        }
    }

    public function testIsRtl()
    {
       $ia=[];
        
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, $i+1000, "Text" + $i + '-');
            ItemArray::addItem($ia, $item, true);
            $this->assertSame($item, $ia[$i]);
        }
        ItemArray::setLang($ia, 'he');
        
        // all 10 items are Hebrew at this point!
        $this->assertTrue(ItemArray::isRtl($ia));
        
        for ($i = 1; $i <= 4; $i++) {
            $ia[$i]->setLang('la');
        }
        $this->assertTrue(ItemArray::isRtl($ia));
        // The 5th non-RTL should tip the scale
        $ia[5]->setLang('la');
        $this->assertFalse(ItemArray::isRtl($ia));
    }
    
    public function testEditScript()
    {
        $itemArray = [];
        
        ItemArray::addItem($itemArray, new Rubric(1, 0, 'Hello '), true);
        ItemArray::addItem($itemArray, new Text(2, 1, 'darkness '), true);
        ItemArray::addItem($itemArray, new Text(3, 2, 'my '), true);
        ItemArray::addItem($itemArray, new Text(4, 3, 'old '), true);
        ItemArray::addItem($itemArray, new Text(5, 4, 'friend '), true);
        
        // The same data, ids and sequences should be irrelevant
        $newItemArray = [];
        ItemArray::addItem($newItemArray, new Rubric(0, 0, 'Hello '), true);
        ItemArray::addItem($newItemArray, new Text(0, 0, 'darkness '), true);
        ItemArray::addItem($newItemArray, new Text(0, 0, 'my '), true);
        ItemArray::addItem($newItemArray, new Text(0, 0, 'old '), true);
        ItemArray::addItem($newItemArray, new Text(0, 0, 'friend '), true);
        
        $script = ItemArray::getEditScript(
            $itemArray, 
            $newItemArray
        );

        //$this->printCommandSequence($script);
        $this->assertCount(5, $script);
        
        $seq = 0;
        foreach ($script as $command) {
            $this->assertEquals(Algorithm\MyersDiff::KEEP, $command[1]);
            $this->assertEquals($seq, $command[2]);
            $seq++;
        }
        
        // Totally different data
        $newItemArray2 = [];
        ItemArray::addItem($newItemArray2, new Rubric(1, 1, 'Hola'), true);
        ItemArray::addItem($newItemArray2, new Text(2, 2, 'oscuridad '), true);
        ItemArray::addItem($newItemArray2, new Text(3, 3, 'mi '), true);
        ItemArray::addItem($newItemArray2, new Text(4, 4, 'vieja '), true);
        ItemArray::addItem($newItemArray2, new Text(5, 5, 'amiga '), true);
        
        $script2 = ItemArray::getEditScript(
            $itemArray, 
            $newItemArray2
        );

        $this->assertCount(10, $script2);
        // First five should be deletes, next 5 should be inserts
        for ($i = 0; $i < 5; $i++) {
            $this->assertEquals(Algorithm\MyersDiff::DELETE, $script2[$i][1]);
            $this->assertEquals($i,$script2[$i][0]);
        }
        for ($i = 5; $i < 10; $i++) {
            $this->assertEquals(Algorithm\MyersDiff::INSERT, $script2[$i][1]);
            $this->assertEquals($i-5,$script2[$i][0]);
            $this->assertEquals($i-5,$script2[$i][2]);
        }
        
        // A switch 
        $newItemArray3 = [];
        ItemArray::addItem($newItemArray3, new Rubric(0, 0, 'Hello '), true);
        ItemArray::addItem($newItemArray3, new Text(0, 0, 'darkness '), true);
        ItemArray::addItem($newItemArray3, new Text(0, 0, 'old '), true);
        ItemArray::addItem($newItemArray3, new Text(0, 0, 'my '), true);
        ItemArray::addItem($newItemArray3, new Text(0, 0, 'friend '), true);
        
        $expectedCommandSequence = [ 
            Algorithm\MyersDiff::KEEP,
            Algorithm\MyersDiff::KEEP,
            Algorithm\MyersDiff::DELETE,
            Algorithm\MyersDiff::KEEP,
            Algorithm\MyersDiff::INSERT,
            Algorithm\MyersDiff::KEEP
        ];
        $script3 = ItemArray::getEditScript(
            $itemArray, 
            $newItemArray3
        );

        //$this->printCommandSequence($script3);
        $this->assertCount(count($expectedCommandSequence), $script3);
        for ($i=0; $i < count($expectedCommandSequence); $i++) {
            $this->assertEquals($expectedCommandSequence[$i], $script3[$i][1]);
        }
    }
    
    private function printCommandSequence($script) {
        $cmds = [-1 => 'D', 0 => 'K', 1=>'I'];
        foreach ($script as $cmd) {
            print $cmds[$cmd[1]] . " ";
        }
        print "\n";
    }
}
