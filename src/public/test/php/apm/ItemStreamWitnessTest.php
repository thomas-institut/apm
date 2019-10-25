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

use AverroesProjectToApm\ItemStream;
use AverroesProjectToApm\ItemStreamWitness;

/**
 * Description of ItemStreamWitnessTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemStreamWitnessTest extends TestCase {
    
    public function testGetTokens() {
        
        $inputJSON = '[[{"id":"17781","type":"1","seq":"1","ce_id":"11565","lang":"la","hand_id":"0","text":"Eliza said that the rain in ","alt_text":null,"extra_info":null,"length":null,"target":null,"e.type":"1","page_id":"3675","col":"1","e.seq":"0","e.hand_id":"0","reference":"0","placement":null,"p.seq":"23","foliation":null},{"id":"17779","type":"11","seq":"2","ce_id":"11565","lang":"la","hand_id":"0","text":"Sp.","alt_text":"Spain","extra_info":null,"length":null,"target":null,"e.type":"1","page_id":"3675","col":"1","e.seq":"0","e.hand_id":"0","reference":"0","placement":null,"p.seq":"23","foliation":null},{"id":"17951","type":"1","seq":"3","ce_id":"11565","lang":"la","hand_id":"0","text":" is always in the  plane. ","alt_text":null,"extra_info":null,"length":null,"target":null,"e.type":"1","page_id":"3675","col":"1","e.seq":"0","e.hand_id":"0","reference":"0","placement":null,"p.seq":"23","foliation":null}]] 
';
        
        $inputRows = json_decode($inputJSON, true);
        //var_dump($inputRows);
        $is = new ItemStream(12, $inputRows);
        $witness = new ItemStreamWitness('AW48', '20', $is);
        
        $tokens = $witness->getTokens();
        
        $this->assertCount(25, $tokens);
        
        
        
    }
}
