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

use APM\Core\Transcription\DocumentTranscription;
use APM\Core\Transcription\DocumentTranscriptionBasic;
use APM\Core\Transcription\PageTranscriptionFactory;
use APM\Core\Transcription\ItemAddressInDocument;

/**
 * Item and descendants class test
 *  
 * As of 2018-10-02, just testing what's needed for 100% coverage
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DocumentTranscriptionTest extends TestCase {
    
    public function testDocumentTranscriptionBasic() {
        $dt = new DocumentTranscriptionBasic();
        $this->doComplianceTest($dt);
    }
    
    /**
     * Compliance test for DocumentTranscription implementations
     * 
     * @param DocumentTranscription $dt
     */
    protected function doComplianceTest(DocumentTranscription $dt) {
        $startPage = 100;
        $endPage = 105;
        $itemsPerPage = 10;
        
        $this->assertEquals(0, $dt->getPageCount());
        $this->assertEquals(DocumentTranscription::UNDEFINED_PAGE, $dt->getFirstTranscribedPageId());
        $this->assertEquals(DocumentTranscription::UNDEFINED_PAGE, $dt->getLastTranscribedPageId());
        $this->assertEquals([], $dt->getItemRange(ItemAddressInDocument::NullAddress(), ItemAddressInDocument::NullAddress()));
        
        $exceptionThrown1 = false;
        try {
            $pt = $dt->getPageTranscription(0);
        } catch (\OutOfBoundsException $ex) {
            $exceptionThrown1 = true;
        }
        $this->assertTrue($exceptionThrown1);
        
        $ptf = new PageTranscriptionFactory();
        
        for ($i = $startPage; $i<=$endPage; $i++) {
            $texts = [];
            for ($j = 0; $j<$itemsPerPage; $j++) {
                $texts[] = $i . ": Line " . ($j+1) . "\n";
            }
            $dt->setPageTranscription($i, $ptf->createPageTranscriptionFromColumnTextArray('la',0, [$texts]));
            $items = $dt->getPageTranscription($i)->getAllMainTextItemsInPage();
            $this->assertCount($itemsPerPage, $items);
        }
        
        $this->assertEquals($endPage-$startPage+1, $dt->getPageCount());
        
        $itemRange1 = $dt->getItemRange(new ItemAddressInDocument($endPage), new ItemAddressInDocument($startPage));
        $this->assertEquals([], $itemRange1);
        $itemRange2 = $dt->getItemRange(new ItemAddressInDocument($startPage), new ItemAddressInDocument($startPage));
        $this->assertCount($itemsPerPage, $itemRange2);
        foreach($itemRange2 as $item) {
            $this->assertEquals($startPage, $item->getAddress()->getPageId());
            $this->assertEquals('la', $item->getItem()->getLanguage());
        }
        
        

    }
}
