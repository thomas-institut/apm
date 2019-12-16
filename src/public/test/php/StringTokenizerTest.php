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

use APM\Core\Token\Token;
use APM\Core\Token\StringTokenizer;
use APM\Core\Address\IntRange;
use APM\Core\Token\StringToken;

/**
 * Description of testWitness
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class StringTokenizerTest extends TestCase {
    
    public function testSimple() {
        
        $words = [ 'This', 'is', 'a', 'simple', 
                   'tést', 'with', 'شسيبش', 'and', 'שדגכש', 
                   'and', 'even', 'some', '日本語'];
        $testString = implode(' ', $words);

        $tokenizer = new StringTokenizer();
        $tokens = $tokenizer->getTokensFromString($testString);
        $this->assertCount(count($words)*2-1, $tokens);
        
        $reconstructedString = '';
        foreach ($tokens as $t) {
            /* @var $t StringToken */
            $this->assertEquals($t->getText(), $t->getNormalization());
            if ($t->getType() === Token::TOKEN_WORD) {
                $this->assertEquals($t->getText(), $tokenizer->getStringRange($testString, $t->getCharRange()));
            }
            $reconstructedString .= $t->getText();
        }
        $this->assertEquals($testString, $reconstructedString);
    }
    
    
    public function testSpecialParsingCases() {
        
        $testCases = [];
        
        // Strings starting with whitespace
        $testCases[] = [ 
            'title' => 'String starting with whitespace',
            'testString' => '   Text',
            'expectedTokens' => [
                new StringToken(Token::TOKEN_WHITESPACE, '   ', 0, 1),
                new StringToken(Token::TOKEN_WORD, 'Text', 3, 1)
            ]
        ];
        
        $testCases[] = [ 
            'title' => 'String starting with whitespace with newline',
            'testString' => "\n  Text",
            'expectedTokens' => [
                new StringToken(Token::TOKEN_WHITESPACE, "\n  ", 0, 1),
                new StringToken(Token::TOKEN_WORD, 'Text', 3, 2)
            ]
        ];
        
        $testCases[] = [ 
            'title' => 'Punctuation followed by new line',
            'testString' => ".\n  Text",
            'expectedTokens' => [
                new StringToken(Token::TOKEN_PUNCT, '.', 0, 1),
                new StringToken(Token::TOKEN_WHITESPACE, "\n  ", 2, 1),
                new StringToken(Token::TOKEN_WORD, 'Text', 3, 2)
            ]
        ];
        
        $testCases[] = [ 
            'title' => 'String starting with punctuation',
            'testString' => ".Text",
            'expectedTokens' => [
                new StringToken(Token::TOKEN_PUNCT, '.', 0, 1),
                new StringToken(Token::TOKEN_WORD, 'Text', 1, 1)
            ]
        ];
        
        $testCases[] = [ 
            'title' => 'String with lines within whitespace',
            'testString' => "Text \n text",
            'expectedTokens' => [
                new StringToken(Token::TOKEN_WORD, 'Text', 0, 1),
                new StringToken(Token::TOKEN_WHITESPACE, " \n ", 4, 1),
                new StringToken(Token::TOKEN_WORD, 'text', 8, 2)
            ]
        ];
        
        $testCases[] = [ 
            'title' => 'Multiple punctuation characters followed by word',
            'testString' => ".;.Text",
            'expectedTokens' => [
                new StringToken(Token::TOKEN_PUNCT, '.', 0, 1),
                new StringToken(Token::TOKEN_PUNCT, ';', 1, 1),
                new StringToken(Token::TOKEN_PUNCT, '.', 2, 1),
                new StringToken(Token::TOKEN_WORD, 'Text', 3, 1)
            ]
        ];

        $tokenizer = new StringTokenizer();
        foreach($testCases as $testCase) {
            $tokens = $tokenizer->getTokensFromString($testCase['testString']);
            $this->assertCount(count($testCase['expectedTokens']), $tokens,$testCase['title']);
            foreach($testCase['expectedTokens'] as $index => $expectedToken) {
                $this->assertEquals($expectedToken->getType(), 
                        $tokens[$index]->getType(), 
                        $testCase['title'] . ', token ' . $index . ', token type');
                $this->assertEquals($expectedToken->getLineNumber(), 
                        $tokens[$index]->getLineNumber(), 
                        $testCase['title'] . ', token ' . $index . ', lineNumber');
                $this->assertEquals($tokenizer->getStringRange($testCase['testString'], $tokens[$index]->getCharRange()),
                        $tokens[$index]->getText(),
                        $testCase['title'] . ', token ' . $index . ', text');
            }
            
        }
    }
    
    
    public function testLineCounts() {
        
        $word = 'SomeWordWشسيithגÁccents';
        $wordLength = strlen($word);
        $whiteSpace=' ';
        $newLine="\n";
        
        $numLines = 3;
        $numWords = 3;
        
        $testString = '';
        for($i=0; $i<$numLines;$i++) {
            $testString .= $word;
            for ($j=0;$j<$numWords-1;$j++) {
                $testString .= $whiteSpace;
                $testString .= $word;
            }
            $testString .= $newLine;
        }

        $tokenizer =new StringTokenizer();
        $tokens = $tokenizer->getTokensFromString($testString);
        
        
        $this->assertCount($numLines*2*$numWords, $tokens);
        $tCount = 0;
        
        foreach($tokens as $t) {
            /* @var $t StringToken */    
            if ($t->getType() === Token::TOKEN_WORD) {
                $this->assertEquals($wordLength, strlen($t->getText()));
            }
            if ($t->getType() === Token::TOKEN_WHITESPACE) {
                $this->assertEquals(1, strlen($t->getText()));
            }
            $this->assertEquals( intdiv($tCount,2*$numWords)+1,   $t->getLineRange()->getStart());
            $tCount++;
        }
    }
    
}
