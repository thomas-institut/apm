<?php

/*
 *  Copyright (C) 2016 Universität zu Köln
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
        $ia = new TxText\ItemArray();
        $this->expectException(\InvalidArgumentException::class);
        $ia->addItem(new ColumnElement\Line());
    }

    public function testAddBadItem2()
    {
        $ia = new TxText\ItemArray();
        $this->expectException(\InvalidArgumentException::class);
        $ia->addItem("somestring");
    }
    
    public function testAddItemsWithSequence()
    {
        $ia = new TxText\ItemArray();
        
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, $i+1, "Text" + $i);
            $ia->addItem($item);
            $this->assertSame($item, $ia->getItem($i));
        }
        $this->assertEquals(10, $ia->nItems());
    }
    
    public function testAddItemsWithoutSequence()
    {
        $ia = new TxText\ItemArray();
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, -1, "Text" + $i);
            $ia->addItem($item);
            $this->assertSame($item, $ia->getItem($i));
            
        }
        $this->assertEquals(10, $ia->nItems());

    }
    
    public function testAddOrderedItems()
    {
        $ia = new TxText\ItemArray();
        
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, $i+1000, "Text" + $i + '-');
            $ia->addItem($item, true);
            $this->assertSame($item, $ia->getItem($i));
        }
        $this->assertEquals(10, $ia->nItems());
        
        return $ia;
    }
    
    /**
     * @depends testAddOrderedItems
     */
    public function testSetLang(TxText\ItemArray $ia) 
    {
        foreach($ia->theItems as $item) {
            $this->assertEquals('', $item->lang);
        }
        $ia->setLang('la');
        foreach($ia->theItems as $item) {
            $this->assertEquals('la', $item->lang);
        }
        
        $ia->setLang('he');
        foreach($ia->theItems as $item) {
            $this->assertEquals('la', $item->lang);
        }
        
        $ia->setLang('he', true);
        foreach($ia->theItems as $item) {
            $this->assertEquals('he', $item->lang);
        }
    }
    
    /**
     * @depends testAddOrderedItems
     */
    public function testSetHandId(TxText\ItemArray $ia) 
    {
        foreach($ia->theItems as $item) {
            $this->assertEquals(-1, $item->handId);
        }
        $ia->setHandId(20);
        foreach($ia->theItems as $item) {
            $this->assertEquals(20, $item->handId);
        }
        
        $ia->setHandId(30);
        foreach($ia->theItems as $item) {
            $this->assertEquals(20, $item->handId);
        }
        
        $ia->setHandId(30, true);
        foreach($ia->theItems as $item) {
            $this->assertEquals(30, $item->handId);
        }
    }
    
    public function testGetText() 
    {
        $ia = new TxText\ItemArray();
        
        $ia->addItem(new TxText\Text(100, -1, "Hello "));
        $ia->addItem(new TxText\Text(101, -1, "World"));
        
        $text = $ia->getText();
        $this->assertEquals('Hello World', $text);
    }
    
    /**
     * @todo Make a more sensible test here!
     * @depends testAddOrderedItems
     */
    public function testSetCElementId($ia)
    {
        foreach($ia->theItems as $item) {
            $item->setColumnElementId(200);
        }
        
        foreach($ia->theItems as $item) {
            $this->assertEquals(200, $item->columnElementId);
        }
    }

    public function testIsRtl()
    {
        $ia = new TxText\ItemArray();
        
        for ($i = 0; $i < 10; $i++) {
            $item = new TxText\Text($i+100, $i+1000, "Text" + $i + '-');
            $ia->addItem($item, true);
            $this->assertSame($item, $ia->getItem($i));
        }
        $ia->setLang('he');
        
        // all 10 items are Hebrew at this point!
        $this->assertTrue($ia->isRtl());
        
        for ($i = 1; $i <= 4; $i++) {
            $ia->getItem($i)->setLang('la');
        }
        $this->assertTrue($ia->isRtl());
        // The 5th non-RTL should tip the scale
        $ia->getItem(5)->setLang('la');
        $this->assertFalse($ia->isRtl());
    }
    
    public function testEditScript()
    {
        $itemArray = new ItemArray();
        
        $itemArray->addItem(new Rubric(1, 0, 'Hello '), true);
        $itemArray->addItem(new Text(2, 1, 'darkness '), true);
        $itemArray->addItem(new Text(3, 2, 'my '), true);
        $itemArray->addItem(new Text(4, 3, 'old '), true);
        $itemArray->addItem(new Text(5, 4, 'friend '), true);
        
        // The same data
        $newItemArray = new ItemArray();
        $newItemArray->addItem(new Rubric(0, 0, 'Hello '), true);
        $newItemArray->addItem(new Text(0, 0, 'darkness '), true);
        $newItemArray->addItem(new Text(0, 0, 'my '), true);
        $newItemArray->addItem(new Text(0, 0, 'old '), true);
        $newItemArray->addItem(new Text(0, 0, 'friend '), true);
        
        $script = $itemArray->getEditScript($newItemArray);
        //$this->printCommandSequence($script);
        $this->assertCount(5, $script);
        
        $seq = 0;
        foreach ($script as $command) {
            $this->assertEquals(Algorithm\MyersDiff::KEEP, $command[1]);
            $this->assertEquals($seq, $command[2]);
            $seq++;
        }
        
        // Totally different data
        $newItemArray2 = new ItemArray();
        $newItemArray2->addItem(new Rubric(1, 1, 'Hola'), true);
        $newItemArray2->addItem(new Text(2, 2, 'oscuridad '), true);
        $newItemArray2->addItem(new Text(3, 3, 'mi '), true);
        $newItemArray2->addItem(new Text(4, 4, 'vieja '), true);
        $newItemArray2->addItem(new Text(5, 5, 'amiga '), true);
        $script2 = $itemArray->getEditScript($newItemArray2);
        
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
        $newItemArray3 = new ItemArray();
        $newItemArray3->addItem(new Rubric(0, 0, 'Hello '), true);
        $newItemArray3->addItem(new Text(0, 0, 'darkness '), true);
        $newItemArray3->addItem(new Text(0, 0, 'old '), true);
        $newItemArray3->addItem(new Text(0, 0, 'my '), true);
        $newItemArray3->addItem(new Text(0, 0, 'friend '), true);
        
        $expectedCommandSequence = [ 
            Algorithm\MyersDiff::KEEP,
            Algorithm\MyersDiff::KEEP,
            Algorithm\MyersDiff::DELETE,
            Algorithm\MyersDiff::KEEP,
            Algorithm\MyersDiff::INSERT,
            Algorithm\MyersDiff::KEEP
        ];
        $script3 = $itemArray->getEditScript($newItemArray3);
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
