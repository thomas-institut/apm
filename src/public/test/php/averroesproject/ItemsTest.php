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

namespace AverroesProject;
require "autoload.php";

use PHPUnit\Framework\TestCase;
/**
 * Description of ItemsTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemsTest extends TestCase {
    
    public function testCreateBadAbbreviation()
    {
        $this->expectException(\InvalidArgumentException::class);
        $abr = new TxText\Abbreviation(1, 1, '', '');
    }
    
    public function testAbbreviation()
    {
        $abr = new TxText\Abbreviation(1, 1, 'Mr', "Mister");
        
        $this->assertEquals('Mister', $abr->getExpansion());
    }
    
    public function testDataEqual()
    {
        $text1 = new TxText\Text(1, 1, 'Some text');
        $text2 = new TxText\Text(2, 2, 'Some text');
        $text3 = new TxText\Text(1, 1, 'Other text');
        $rubric1 = new TxText\Rubric(1, 1, 'Some text');
        $abr1 = new TxText\Abbreviation(1, 1, 'Mr', "Mister");
        $abr2 = new TxText\Abbreviation(1, 1, 'Mr.', "Mister");
        $abr3 = new TxText\Abbreviation(1, 1, 'Mr', "Mister ");
        $abr4 = new TxText\Abbreviation(1, 5, 'Mr', "Mister");
        
        $this->assertTrue(TxText\Item::isItemDataEqual($text1, $text2));
        $this->assertFalse(TxText\Item::isItemDataEqual($text1, $text3));
        $this->assertFalse(TxText\Item::isItemDataEqual($text1, $rubric1));
        $this->assertFalse(TxText\Item::isItemDataEqual($abr1, $abr2));
        $this->assertFalse(TxText\Item::isItemDataEqual($abr1, $abr3));
        $this->assertTrue(TxText\Item::isItemDataEqual($abr1, $abr4));
    }
}
