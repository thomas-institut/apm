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
/**
 * Description of ItemArrayTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemArrayTest extends TestCase {
    
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
            $this->assertSame($item, $ia->getItem($i+1));
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
    /**
     * @depends testAddOrderedItems
     */
    public function testIsRtl($ia)
    {
        // all 10 items are Hebrew at this point!
        $this->assertTrue($ia->isRtl());
        
        for ($i = 0; $i < 4; $i++) {
            $ia->getItem($i)->setLang('la');
        }
        $this->assertTrue($ia->isRtl());
        // The 5th non-RTL should tip the scale
        $ia->getItem(4)->setLang('la');
        $this->assertFalse($ia->isRtl());

    }
    

}
