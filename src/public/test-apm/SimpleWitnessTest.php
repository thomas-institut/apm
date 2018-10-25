<?php

/*
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
            new Token(Token::TOKEN_WORD, 'This'),
            new Token(Token::TOKEN_WS, ' '),
            new Token(Token::TOKEN_WORD, 'is'),
            new Token(Token::TOKEN_WS, ' '),
            new Token(Token::TOKEN_WORD, 'a'),
            new Token(Token::TOKEN_WS, ' '),
            new Token(Token::TOKEN_WORD, 'test'),
            new Token(Token::TOKEN_PUNCT, '.'),
        ];
        
        $normalizedText = "This is a test.";
        $numTokens = count($sourceTokens);
        
        $w = new SimpleWitness($workTitle, $chunkRef, $sourceTokens);
        
        $tokens = $w->getTokens();
        $this->assertCount($numTokens, $tokens);
        $this->assertEquals($normalizedText, $w->getPlainText());
        
        $this->assertEquals($workTitle, $w->getWork());
        $this->assertEquals($chunkRef, $w->getChunk());
    }
}
