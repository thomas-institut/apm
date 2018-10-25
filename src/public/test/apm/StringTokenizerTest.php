<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM;
require "../vendor/autoload.php";

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
        
        $tokens = StringTokenizer::getTokensFromString($testString);
        $this->assertCount(count($words)*2-1, $tokens);
        
        $reconstructedString = '';
        foreach ($tokens as $t) {
            /* @var $t StringToken */
            $this->assertEquals($t->getText(), $t->getNormalization());
            if ($t->getType() === Token::TOKEN_WORD) {
                $this->assertEquals($t->getText(), StringTokenizer::getStringRange($testString, $t->getCharRange()));
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
                new StringToken(Token::TOKEN_WS, '   ', 0, 1),
                new StringToken(Token::TOKEN_WORD, 'Text', 3, 1)
            ]
        ];
        
        $testCases[] = [ 
            'title' => 'String starting with whitespace with newline',
            'testString' => "\n  Text",
            'expectedTokens' => [
                new StringToken(Token::TOKEN_WS, "\n  ", 0, 1),
                new StringToken(Token::TOKEN_WORD, 'Text', 3, 2)
            ]
        ];
        
        $testCases[] = [ 
            'title' => 'Punctuation followed by new line',
            'testString' => ".\n  Text",
            'expectedTokens' => [
                new StringToken(Token::TOKEN_PUNCT, '.', 0, 1),
                new StringToken(Token::TOKEN_WS, "\n  ", 2, 1),
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
                new StringToken(Token::TOKEN_WS, " \n ", 4, 1),
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
        
        foreach($testCases as $testCase) {
            $tokens = StringTokenizer::getTokensFromString($testCase['testString']);
            $this->assertCount(count($testCase['expectedTokens']), $tokens,$testCase['title']);
            foreach($testCase['expectedTokens'] as $index => $expectedToken) {
                $this->assertEquals($expectedToken->getType(), 
                        $tokens[$index]->getType(), 
                        $testCase['title'] . ', token ' . $index . ', token type');
                $this->assertEquals($expectedToken->getLineNumber(), 
                        $tokens[$index]->getLineNumber(), 
                        $testCase['title'] . ', token ' . $index . ', lineNumber');
                $this->assertEquals(StringTokenizer::getStringRange($testCase['testString'], $tokens[$index]->getCharRange()),
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
        $tokens = StringTokenizer::getTokensFromString($testString);
        
        
        $this->assertCount($numLines*2*$numWords, $tokens);
        $tCount = 0;
        
        foreach($tokens as $t) {
            /* @var $t StringToken */    
            if ($t->getType() === Token::TOKEN_WORD) {
                $this->assertEquals($wordLength, strlen($t->getText()));
            }
            if ($t->getType() === Token::TOKEN_WS) {
                $this->assertEquals(1, strlen($t->getText()));
            }
            $this->assertEquals( intdiv($tCount,2*$numWords)+1,   $t->getLineRange()->getStart());
            $tCount++;
        }
    }
    
}
