<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject;
require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use AverroesProject\Collation\Tokenizer;
use AverroesProject\TxText\Text;
use AverroesProject\TxText\Rubric;

/**
 * Description of TranscriptionReaderTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TokenizerTest extends TestCase {
     
       
    public function testSplit()
    {
        $testCases = [ 
            [ 
                'text' => 'Two words', 
                'expected' => [
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'Two'], 
                    ['type' => Tokenizer::TOKEN_WS, 'text' => ' '], 
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'words']
                ]
            ],
            [ 
                'text' => 'Two. Sentences.', 
                'expected' => [
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'Two'], 
                    ['type' => Tokenizer::TOKEN_PUNCT, 'text' => '.'], 
                    ['type' => Tokenizer::TOKEN_WS, 'text' => ' '], 
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'Sentences'], 
                    ['type' => Tokenizer::TOKEN_PUNCT, 'text' => '.']
                ]
            ],
            [ 
                'text' => "\n", 
                'expected' => [ 
                    ['type' => Tokenizer::TOKEN_WS, 'text' => "\n"]
                ],
            ],
            [ 
                'text' => "...to be continued!\n", 
                'expected' => [ 
                    ['type' => Tokenizer::TOKEN_PUNCT, 'text' => '.'],
                    ['type' => Tokenizer::TOKEN_PUNCT, 'text' => '.'],
                    ['type' => Tokenizer::TOKEN_PUNCT, 'text' => '.'],
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'to'],
                    ['type' => Tokenizer::TOKEN_WS, 'text' => ' '],
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'be'],
                    ['type' => Tokenizer::TOKEN_WS, 'text' => ' '],
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'continued'],
                    ['type' => Tokenizer::TOKEN_PUNCT, 'text' => '!'],
                    ['type' => Tokenizer::TOKEN_WS, 'text' => "\n"]
                ],
            ],
            [
                'text' => 'בב"ח ולזה',
                'expected' => [
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'בב"ח'],
                    ['type' => Tokenizer::TOKEN_WS, 'text' => ' '],
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => 'ולזה'],
                ]
            ]
        ];
        
        foreach($testCases as $testCase) {
            $tokens = Tokenizer::splitText($testCase['text']);
            $this->assertCount(count($testCase['expected']), $tokens);
            for ($i = 0; $i < count($tokens); $i++) {
                $this->assertEquals($testCase['expected'][$i]['text'], $tokens[$i]['text']);
                $this->assertEquals($testCase['expected'][$i]['type'], $tokens[$i]['type']);
            }
        }
        
    }
    
    public function testSimpleTokens(){
        
        
        $testCases = [
            [   // TEST CASE 1
                'items' => [
                    new Text(1, 0, "This is a simple sentence."),
                ], 
                'expected' => [
                    ['t' => 'This', 'itemType' => TxText\Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => TxText\Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => TxText\Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => TxText\Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => TxText\Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => TxText\Item::TEXT, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
            ]
        ];
        
       foreach($testCases as $testCase) {
           $tokens = Tokenizer::tokenize($testCase['item']);
           $this->assertCount(count($testCase['expected']), $tokens);
       }
    }

}
