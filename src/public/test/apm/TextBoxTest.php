<?php
/*
 * 
 * Copyright (C) 2018 Universität zu Köln
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

namespace APM;

require "../vendor/autoload.php";

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
        
        $tb = new TextBox('testType', 'somePlacement');
        
        $this->assertEquals([], $tb->getItems());
        
        $exceptionThrown = false;
        try {
            $tb->setItems([1, 2, 3]);
        } catch (\InvalidArgumentException $ex) {
            $exceptionThrown = true;
        }
        $this->assertTrue($exceptionThrown);
        
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