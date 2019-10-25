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

namespace APM;

require "autoload.php";

use PHPUnit\Framework\TestCase;

use APM\Core\Transcription\PageTranscription;
use APM\Core\Transcription\PageTranscriptionBasic;
use APM\Core\Transcription\TextBoxFactory;
use APM\Core\Item\ItemFactory;
use APM\Core\Transcription\ItemAddressInPage;

/**
 * Item and descendants class test
 *  
 * As of 2018-10-02, just testing what's needed for 100% coverage
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PageTranscriptionTest extends TestCase {
    
    public function testPageTranscriptionBasic() {
        $pt = new PageTranscriptionBasic();
        $this->doComplianceTest($pt);
        $pt2 = new PageTranscriptionBasic();
        $this->doNestedReferencesTest($pt2, 5);
    }
    
    protected function doNestedReferencesTest(PageTranscription $pt, $nestingLevels) {
        
        $baseText = 'Test text ';
        $baseText2 = ' and more text';
        
        $tbf = new TextBoxFactory();
        $if = new ItemFactory('la', 0);
        $mainBox = $tbf->createColumn(1);
        $mainBox->setItems([
            $if->createPlainTextItem($baseText),
            $if->createReferenceMark('[1]'),
            $if->createPlainTextItem($baseText2)
        ]);
        
        $mbIndex = $pt->addTextBox($mainBox);
        
        $previousLevel = $mbIndex;
        for($i = 0; $i < $nestingLevels; $i++) {
            $additionBox = $tbf->createMarginalAddition('margin', 
                    new ItemAddressInPage($previousLevel, 1));
            $additionBox->setItems([
                $if->createPlainTextItem($baseText . ' at level ' . $i),
                $if->createReferenceMark('[1]'),
                $if->createPlainTextItem($baseText2 . ' at level ' . $i)
            ]);
            $previousLevel = $pt->addTextBox($additionBox);
        }
        
        $this->assertEquals($nestingLevels+1, $pt->getTextBoxCount());
        
        $items = $pt->getAllItems();
        $this->assertCount(($nestingLevels+1)*3, $items);
        //$this->prettyPrintItemArray($items);
    }
    
    
    /**
     * Compliance test for PageTranscription implementations
     * 
     * @param PageTranscription $pt
     */
    protected function doComplianceTest(PageTranscription $pt) {
        $this->assertEquals(0, $pt->getTextBoxCount());
        $this->assertEquals([], $pt->getAllItems());
        
        $exceptionThrown = false;
        try {
            $textBox20 = $pt->getTextBoxByIndex(20);
        } catch (\OutOfBoundsException $ex) {
            $exceptionThrown = true;
        }
        $this->assertTrue($exceptionThrown);
        
        $exceptionThrown = false;
        try {
            $ref = $pt->getTextBoxReference(20);
        } catch (\OutOfBoundsException $ex) {
            $exceptionThrown = true;
        }
        $this->assertTrue($exceptionThrown);

        $tbf = new TextBoxFactory();
        $column = $tbf->createColumn(1);
        
        $tbIndex = $pt->addTextBox($column);
        
        $this->assertEquals(1, $pt->getTextBoxCount());
        $this->assertEquals([], $pt->getAllItems());
        
        $exceptionThrown = false;
        try { 
            $pt->replaceTextBox($tbIndex+1, $column);
        } 
        catch (\OutOfBoundsException $ex) {
            $exceptionThrown = true;
        }
        $this->assertTrue($exceptionThrown);
        
        $if = new ItemFactory('la', 0);
        $plainText1 = 'This is a test';
        $rubricText = ' with a rubric ';
        $markText = '[1]';
        $plainText2 = ' and more text at the end';
        $column->setItems([ 
            $if->createPlainTextItem($plainText1),
            $if->createRubricItem($rubricText),
            $if->createReferenceMark($markText),
            $if->createPlainTextItem($plainText2)
        ]);
        $pt->replaceTextBox($tbIndex, $column);
        
        $this->assertEquals(1, $pt->getTextBoxCount());
        $items = $pt->getAllItems();
        //$this->prettyPrintItemArray($items, 'Items');
        $this->assertCount(4, $items);
        $this->assertEquals($plainText1, $items[0]->getItem()->getPlainText());
        $this->assertEquals($rubricText, $items[1]->getItem()->getPlainText());
        $this->assertEquals($markText, $items[2]->getItem()->getMarkText());
        $this->assertEquals($plainText2, $items[3]->getItem()->getPlainText());
        foreach($items as $item) {
            $this->assertEquals($tbIndex, $item->getAddress()->getTbIndex());
        }
        
        // Add a non-main text, "hanging" textbox
        $gloss = $tbf->createMarginalGloss('margin left', ItemAddressInPage::NullAddress());
        $gloss->setItems([
            $if->createPlainTextItem($plainText1),
            $if->createRubricItem($rubricText)
           ]);
        $gIndex = $pt->addTextBox($gloss);
        $this->assertEquals(2, $pt->getTextBoxCount());
        $items2 = $pt->getAllItems();
        $this->assertEquals($items, $items2);
        
        // Add a marginal addition
        $addition = $tbf->createMarginalAddition('margin left', new ItemAddressInPage(0, 2) );
        $addition->setItems([
            $if->createPlainTextItem('This is an addition')
        ]);
        $additionIndex = $pt->addTextBox($addition);
        $this->assertEquals(3, $pt->getTextBoxCount());

        $items3 = $pt->getAllItems();
        //$this->prettyPrintItemArray($items3, 'Items3');
        
        $this->assertCount(5, $items3);
        $this->assertEquals($additionIndex, $items3[3]->getAddress()->getTbIndex());
        
        // Various item ranges
        
        $itemRange1 = $pt->getItemRange(ItemAddressInPage::NullAddress(), ItemAddressInPage::NullAddress());
        //$this->prettyPrintItemArray($itemRange1, 'ItemsRange1');
        $this->assertCount(5, $itemRange1);
        foreach ($itemRange1 as $index => $item) {
            $this->assertEquals($item, $items3[$index]);
        }
        
        $itemRange2 = $pt->getItemRange(new ItemAddressInPage(0,1), ItemAddressInPage::NullAddress());
        $this->assertCount(4, $itemRange2);
        foreach ($itemRange2 as $index => $item) {
            $this->assertEquals($item, $items3[$index+1]);
        }
        
        $itemRange3 = $pt->getItemRange(ItemAddressInPage::NullAddress(), new ItemAddressInPage(0,2));
        $this->assertCount(3, $itemRange3);
        foreach ($itemRange3 as $index => $item) {
            $this->assertEquals($item, $items3[$index]);
        }
        
        // non-existent ranges
        $itemRange4 = $pt->getItemRange(new ItemAddressInPage(0,5), ItemAddressInPage::NullAddress());
        $this->assertEquals([], $itemRange4);
        $itemRange5 = $pt->getItemRange(ItemAddressInPage::NullAddress(), new ItemAddressInPage(0,5));
        $this->assertEquals([], $itemRange5);
        $itemRange6 = $pt->getItemRange(new ItemAddressInPage(0,3), new ItemAddressInPage(0,1));
        $this->assertEquals([], $itemRange5);
    }
    
    protected function prettyPrintItemArray(array $items, string $title = '') {
        print "\n" . $title . "\n";
        foreach($items as $key => $item) {
            /* @var $item Core\Transcription\ItemInPage */
            print $key . ' : (' . $item->getAddress()->getTbIndex() . 
                    ', ' . $item->getAddress()->getItemIndex() . ') : ';
            if (is_a($item->getItem(), 'APM\Core\Item\TextualItem' )) {
                print 'TextualItem :  \'' . $item->getItem()->getPlainText() . "'";
            }
            if (is_a($item->getItem(), 'APM\Core\Item\Mark' )) {
                print 'Mark ' . $item->getItem()->getMarkText();
            }
            print "\n";
                    
        }
    }
  
}
