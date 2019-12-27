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

use APM\Core\Token\TokenType;
use PHPUnit\Framework\TestCase;

use APM\Core\Witness\SimpleWitness;
use APM\Core\Token\Token;

/**
 * Description of testWitness
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SimpleWitnessTest extends TestCase {
    
    public function testSimple() {
        
        $workTitle = 'testWork';
        $chunkRef = 'testChunk';
        
        $sourceTokens = [ 
            new Token(TokenType::WORD, 'This'),
            new Token(TokenType::WHITESPACE, ' '),
            new Token(TokenType::WORD, 'is'),
            new Token(TokenType::WHITESPACE, ' '),
            new Token(TokenType::WORD, 'a'),
            new Token(TokenType::WHITESPACE, ' '),
            new Token(TokenType::WORD, 'test'),
            new Token(TokenType::PUNCTUATION, '.'),
        ];
        
        $normalizedText = "This is a test.";
        $numTokens = count($sourceTokens);
        
        $w = new SimpleWitness($workTitle, $chunkRef, $sourceTokens);
        
        $tokens = $w->getTokens();
        $this->assertCount($numTokens, $tokens);
        $this->assertEquals($normalizedText, $w->getPlainText());
        
        $this->assertEquals($workTitle, $w->getWorkId());
        $this->assertEquals($chunkRef, $w->getChunkId());
    }
}
