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
use AverroesProject\TxText\Item;

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
            ],
            [
                'text' => "החלקיים",
                'expected' => [
                    ['type' => Tokenizer::TOKEN_WORD, 'text' => "החלקיים"]
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
            [   // TEST CASE 1: Single item with whitespace and punctuation
                'items' => [
                    new Text(1, 0, "  This is a simple\n sentence.  "),
                ], 
                'expected' => [
                    ['t' => 'This', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
            ],
            [ // TEST CASE 2: two items
                'items' => [
                    new Text(1, 0, "This is a"),
                    new Text(2, 1, " simple\n sentence.")
                ],
                'expected' => [
                    ['t' => 'This', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
                
            ],
            [ // TEST CASE 3: two items, no word break between them
                'items' => [
                    new Text(1, 0, "This is a sim"),
                    new Text(2, 1, "ple\n sentence.")
                ],
                'expected' => [
                    ['t' => 'This', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
            ],
            [ // TEST CASE 4: A word split between two items of different type
              //  the split word inherits the item type of its first part
                'items' => [
                    new TxText\Initial(1, 0, "T"),
                    new Text(2, 1, "his is a simple\n sentence.")
                ],
                'expected' => [
                    ['t' => 'This', 'itemType' => Item::INITIAL, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
            ],
            [ // TEST CASE 5: A rubric with a new line in between
                'items' => [
                    new Rubric(1, 0, "This is a simple"),
                    new Text(2, 1, "\n"),
                    new Rubric(3, 2, "sentence.")
                ],
                'expected' => [
                    ['t' => 'This', 'itemType' => Item::RUBRIC, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => Item::RUBRIC, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => Item::RUBRIC, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => Item::RUBRIC, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => Item::RUBRIC, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => Item::RUBRIC, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
            ]
        ];
        
       foreach($testCases as $testCase) {
           $tokens = Tokenizer::tokenize($testCase['items']);
           //print_r($tokens);
           $this->assertCount(count($testCase['expected']), $tokens);
           for ($i = 0; $i < count($tokens); $i++) {
               $this->assertEquals($testCase['expected'][$i]['t'], $tokens[$i]['t']);
               $this->assertEquals($testCase['expected'][$i]['itemType'], $tokens[$i]['itemType']);
           }
       }
    }
    
    public function testNonWordBreakHyphens()
    {
        $testCases = [
            [   // TEST CASE 
                'items' => [
                    new Text(1, 0, "  This is a sim"),
                    new TxText\NoWordBreak(2, 1),
                    new Text(3,2, "\nple sentence.")
                ], 
                'expected' => [
                    ['t' => 'This', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
            ],
            [   // TEST CASE 2 : more white space
                'items' => [
                    new Text(1, 0, "  This is a sim"),
                    new TxText\NoWordBreak(2, 1),
                    new Text(3,2, "   \n  "),
                    new Text(4,3, "\nple sentence.")
                ], 
                'expected' => [
                    ['t' => 'This', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
            ],
            [   // TEST CASE 3 : Punctuation after NoWB
                'items' => [
                    new Text(1, 0, "  This is a simple sentence"),
                    new TxText\NoWordBreak(2, 1),
                    new Text(3,2, "\n.")
                ], 
                'expected' => [
                    ['t' => 'This', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'is', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'a', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'simple', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => 'sentence', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_WORD],
                    ['t' => '.', 'itemType' => Item::TEXT, 'tokenType' => Tokenizer::TOKEN_PUNCT]
                ]
            ],
            
        ];
        
        foreach($testCases as $testCase) {
           $tokens = Tokenizer::tokenize($testCase['items']);
           $this->assertCount(count($testCase['expected']), $tokens);
           for ($i = 0; $i < count($tokens); $i++) {
               $this->assertEquals($testCase['expected'][$i]['t'], $tokens[$i]['t']);
               $this->assertEquals($testCase['expected'][$i]['itemType'], $tokens[$i]['itemType']);
           }
       }
        
    }

}
