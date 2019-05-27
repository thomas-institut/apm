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
require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;

use APM\Core\Witness\StringWitness;

/**
 * Description of testWitness
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class StringWitnessTest extends TestCase {
    
    public function testSimple() {
        
        $workTitle = 'testWork';
        $chunkRef = 'testChunk';
        $witnessText = "This is \t a test  . The test of the witness.";
        $normalizedText = "This is a test. The test of the witness.";
        $numTokens = 11;
        
        $w = new StringWitness($workTitle, $chunkRef, $witnessText);
        $this->assertEquals($witnessText, $w->getSourceString());
        
        $tokens = $w->getTokens();
        $this->assertCount($numTokens, $tokens);
        
        foreach ($tokens as $t) {
            $this->assertEquals($t->getText(), $t->getNormalization());
            $this->assertEquals(1, $t->getLineNumber());
        }
        $this->assertEquals($normalizedText, $w->getPlainText());
    }
    
    public function testConstructor() {
        $exceptionRaised1 = false;
        try {
            $w = new StringWitness('tw', 'tchunk', '');
        } catch (\InvalidArgumentException $ex) {
            $exceptionRaised1 = true;
        }
        $this->assertTrue($exceptionRaised1);
    }
}
