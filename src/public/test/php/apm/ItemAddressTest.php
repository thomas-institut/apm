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
use APM\Core\Transcription\ItemAddressInDocument;
use APM\Core\Transcription\ItemAddressInPage;
/**
 * Description of ItemAddressTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemAddressTest  extends TestCase {
    
    public function testItemAddressInPage() {
        $a1 = new ItemAddressInPage();
        $this->assertTrue($a1->isNull());
        $a1->setCoord(0, 1);
        $this->assertFalse($a1->isNull());
        
        $a2 = new ItemAddressInPage(0,0);
        $this->assertFalse($a1->isNull());
    }
    
    
    public function testItemAddressInDocument() {
        $a1 = new ItemAddressInDocument();
        $a2 = new ItemAddressInDocument();
        $this->assertTrue($a1->isNull());
        $this->assertTrue($a1->isEqualTo($a2));
        
        $a3 = new ItemAddressInDocument(0,0,0);
        $a4 = new ItemAddressInDocument(0,0,1);
        $a5 = new ItemAddressInDocument(1,0,0);
        
        $this->assertFalse($a3->isEqualTo($a4));
        $this->assertFalse($a3->isEqualTo($a5));
        
    }
}
