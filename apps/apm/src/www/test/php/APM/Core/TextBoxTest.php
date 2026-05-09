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

namespace APM\Test\Core;


use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

use APM\Core\Transcription\TextBox;
use APM\Core\Transcription\TextBoxFactory;
use APM\Core\Transcription\ItemAddressInPage;

/**
 * TextBox test
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TextBoxTest extends TestCase {
    
    
    public function testSimple() {

        $exceptionThrown = false;
        $errorCode = 0;
        try {
            $badBox = new TextBox('', 'somePlacement', false, ItemAddressInPage::NullAddress(), []);
        } catch (InvalidArgumentException $ex) {
            $exceptionThrown = true;
            $errorCode = $ex->getCode();
        }
        $this->assertTrue($exceptionThrown);
        $this->assertEquals(TextBox::ERROR_INVALID_TYPE, $errorCode);


        $tb = new TextBox('testType', 'somePlacement', false, ItemAddressInPage::NullAddress(), []);
        
        $this->assertEquals([], $tb->getItems());
        
        $exceptionThrown = false;
        try {
            $tb->setItems([1, 2, 3]);
        } catch (InvalidArgumentException $ex) {
            $exceptionThrown = true;
            $errorCode = $ex->getCode();
        }
        $this->assertTrue($exceptionThrown);
        $this->assertEquals(TextBox::ERROR_INVALID_ITEM_ARRAY, $errorCode);

        $tb->setAsMainText();
        $this->assertTrue($tb->isMainText());
        $tb->setAsNotMainText();
        $this->assertFalse($tb->isMainText());
        
    }
    
    public function testTextBoxFactory() {
    
        $tbf = new TextBoxFactory();
        
        $column = $tbf->createColumn(1);
        $this->assertCount(0, $column->getItems());
        $this->assertTrue($column->getReference()->isNull());
        $this->assertEquals('column-1', $column->getPlacement());
        $this->assertEquals('column', $column->getType());
        $this->assertTrue($column->isMainText());
        
        $addition = $tbf->createMarginalAddition('margin left', ItemAddressInPage::NullAddress());
        $this->assertCount(0, $addition->getItems());
        $this->assertTrue($addition->getReference()->isNull());
        $this->assertEquals('margin left', $addition->getPlacement());
        $this->assertEquals('addition', $addition->getType());
        $this->assertTrue($addition->isMainText());
        
        $gloss = $tbf->createMarginalGloss('margin left', ItemAddressInPage::NullAddress());
        $this->assertCount(0, $gloss->getItems());
        $this->assertTrue($gloss->getReference()->isNull());
        $this->assertEquals('margin left', $gloss->getPlacement());
        $this->assertEquals('gloss', $gloss->getType());
        $this->assertFalse($gloss->isMainText());

    }
    
}
