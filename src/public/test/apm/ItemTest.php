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

use APM\Core\Item\TextualItem;
use APM\Core\Item\Mark;
use APM\Core\Item\ItemFactory;

/**
 * Item and descendants class test
 *  
 * As of 2018-10-02, just testing what's needed for 100% coverage
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemTest extends TestCase {
    
   
    
    public function testSimple() {
        $testString = 'some string';
        $testString2 = 'other string';
        $item1 = new TextualItem($testString);
        $this->assertEquals($testString, $item1->getPlainText());
        $this->assertEquals($testString, $item1->getNormalizedText());
        
        $item1->setNormalization($testString2, 'abbr');
        $this->assertEquals($testString2, $item1->getNormalizedText());
        
        $exceptionRaised1 = false;
        try {
            $item1 = new TextualItem('');
        } catch (\InvalidArgumentException $ex) {
            $exceptionRaised1 = true;
        }
        $this->assertTrue($exceptionRaised1);
        
        $item1->setHand(5);
        $this->assertEquals(5, $item1->getHand());
        
        $item1->setLanguage('la');
        $this->assertEquals('la', $item1->getLanguage());
        
        $item1->setFormat('rubric');
        $this->assertEquals('rubric', $item1->getFormat());
        
        $mark = new  Mark();
        $this->assertEquals('', $mark->getPlainText());
        $this->assertEquals('', $mark->getNormalizedText());
    }
    
    public function testItemFactory() {
        $defaultLang = 'la';
        $defaultHand = 1;
        
        $if = new ItemFactory($defaultLang, $defaultHand);
        
        $item1 = $if->createPlainTextItem('some text');
        
        $this->assertEquals($defaultLang, $item1->getLanguage());
        $this->assertEquals($defaultHand, $item1->getHand());
        $this->assertEquals('some text', $item1->getPlainText());
        $this->assertEquals('some text', $item1->getNormalizedText());
        $this->assertEquals('', $item1->getFormat());
        
        $item2 = $if->createAbbreviationItem('Dr', 'Doctor');
        $this->assertEquals($defaultLang, $item2->getLanguage());
        $this->assertEquals($defaultHand, $item2->getHand());
        $this->assertEquals('Dr', $item2->getPlainText());
        $this->assertEquals('Doctor', $item2->getNormalizedText());
        $this->assertEquals('', $item2->getFormat());
        
        $item3 = $if->createRubricItem('Some rubric');
        $this->assertEquals($defaultLang, $item3->getLanguage());
        $this->assertEquals($defaultHand, $item3->getHand());
        $this->assertEquals('Some rubric', $item3->getPlainText());
        $this->assertEquals('Some rubric', $item3->getNormalizedText());
        $this->assertEquals('rubric', $item3->getFormat());
        
        $item4 = $if->createReferenceMark('someText');
        $this->assertEquals('someText', $item4->getMarkText());
        $this->assertEquals('ref', $item4->getMarkType());
    }
    
}
