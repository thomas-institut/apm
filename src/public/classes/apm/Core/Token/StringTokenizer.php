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

namespace APM\Core\Token;

use APM\Core\Address\IntRange;
/**
 * Description of Tokenizer
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class StringTokenizer {
    
    public static function mbStringToArray ($string) { 
        $strlen = mb_strlen($string); 
        $array = [];
        while ($strlen) { 
            $array[] = mb_substr($string,0,1,"UTF-8"); 
            $string = mb_substr($string,1,$strlen,"UTF-8"); 
            $strlen = mb_strlen($string); 
        } 
        return $array; 
    } 
    
    public static function getStringRange(string $theString, IntRange $range) {
        return mb_substr($theString, $range->getStart(), $range->getLength());
    }
    
    private static function createToken($type, $text, $index1, $index2, $l1, $l2)
    {
        /* @var $newToken StringToken */
        $newToken = new StringToken($type, $text, $index1, $l1, $l2);
        // Is there a case in which $index2 != $index + strlen($text) ? 
        // if so, this takes care of it
        $newToken->setCharRange(IntRange::RangeFromStartEnd($index1, $index2));
        return $newToken;
    }
    
    /**
     * Splits the given string into an array 
     * of text tokens.
     * 
     * Text tokens can be of the following kinds:
     *  - whitespace
     *  - punctuation
     *  - words
     * 
     * @param string $theText
     * @returns array of tokens
     */
    public static function getTokensFromString(string $theText) : array
    {
        $tokens = [];
        $currentTokenCharacters = [];
        $currentTokenType = Token::TOKEN_UNDEFINED;
        $state = 0;
        $currentTokenStartIndex = 0;
        $currentTokenStartLine = 1;
        $currentLine = 1;
        $wsRegExp = '\s+';
        $puntRegExp = '[\.,;:\(\)\[\]¶⊙!]+';
        mb_regex_encoding('UTF-8');
        $text = self::mbStringToArray($theText);
        
        for ($i=0; $i < count($text); $i++) {
            switch($state) {
                case 0: 
                    // State 0: Initial state
                    if (mb_ereg($wsRegExp, $text[$i])) {
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = Token::TOKEN_WS;
                        if ($text[$i] === "\n") {
                            $currentLine++;
                        }
                        $state = 1;
                        break;
                    }
                    if (mb_ereg($puntRegExp, $text[$i])) {
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = Token::TOKEN_PUNCT;
                        $state = 2;
                        break;
                    }
                    $currentTokenCharacters[] = $text[$i];
                    $currentTokenType = Token::TOKEN_WORD;
                    $state = 3;
                    break;
                
                case 1:
                    // State 1: Processing white space
                    if (mb_ereg($wsRegExp, $text[$i])) {
                        $currentTokenCharacters[] = $text[$i];
                        if ($text[$i] === "\n") {
                            $currentLine++;
                        }
                        break;
                    }
                    if (mb_ereg($puntRegExp, $text[$i])) {
                        $tokens[] = self::createToken($currentTokenType, 
                                implode($currentTokenCharacters), 
                                $currentTokenStartIndex, $i-1, 
                                $currentTokenStartLine, $currentLine);
                        $currentTokenStartLine = $currentLine;
                        $currentTokenStartIndex = $i;
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = Token::TOKEN_PUNCT;
                        $state = 2;
                        break;
                    }
                    $tokens[] = self::createToken($currentTokenType, 
                        implode($currentTokenCharacters), 
                        $currentTokenStartIndex, $i-1, 
                        $currentTokenStartLine, $currentLine);
                    $currentTokenStartLine = $currentLine;
                    $currentTokenStartIndex = $i;
                    $currentTokenCharacters  = [];
                    $currentTokenCharacters[] = $text[$i];
                    $currentTokenType = Token::TOKEN_WORD;
                    $state = 3;
                    break;
                    
                case 2:
                    // State 2: processing punctuation
                    if (mb_ereg($wsRegExp, $text[$i])) {
                        $tokens[] = self::createToken($currentTokenType, 
                            implode($currentTokenCharacters), 
                            $currentTokenStartIndex, $i-1, 
                            $currentTokenStartLine, $currentLine);
                        $currentTokenStartLine = $currentLine;
                        $currentTokenStartIndex = $i;
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = Token::TOKEN_WS;
                        if ($text[$i] === "\n") {
                            $currentLine++;
                        }
                        $state = 1;
                        break;
                    }
                    if (mb_ereg($puntRegExp, $text[$i])) {
                        // punctuation characters generate one token per character
                        $tokens[] = self::createToken($currentTokenType, 
                            implode($currentTokenCharacters), 
                            $currentTokenStartIndex, $i-1, 
                            $currentTokenStartLine, $currentLine);
                        $currentTokenStartLine = $currentLine;
                        $currentTokenStartIndex = $i;
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = Token::TOKEN_PUNCT;
                        break;
                    }
                    $tokens[] = self::createToken($currentTokenType, 
                        implode($currentTokenCharacters), 
                        $currentTokenStartIndex, $i-1, 
                        $currentTokenStartLine, $currentLine);
                    $currentTokenStartLine = $currentLine;
                    $currentTokenStartIndex = $i;
                    $currentTokenCharacters  = [];
                    $currentTokenCharacters[] = $text[$i];
                    $currentTokenType = Token::TOKEN_WORD;
                    $state = 3;
                    break;
                    
                case 3: 
                    // State 3: processing a word
                    if (mb_ereg($wsRegExp, $text[$i])) {
                        $tokens[] = self::createToken($currentTokenType, 
                            implode($currentTokenCharacters), 
                            $currentTokenStartIndex, $i-1, 
                            $currentTokenStartLine, $currentLine);
                        $currentTokenStartLine = $currentLine;
                        $currentTokenStartIndex = $i;
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = Token::TOKEN_WS;
                        if ($text[$i] === "\n") {
                            $currentLine++;
                        }
                        $state = 1;
                        break;
                    }
                    if (mb_ereg($puntRegExp, $text[$i])) {
                        $tokens[] = self::createToken($currentTokenType, 
                            implode($currentTokenCharacters), 
                            $currentTokenStartIndex, $i-1, 
                            $currentTokenStartLine, $currentLine);
                        $currentTokenStartLine = $currentLine;
                        $currentTokenStartIndex = $i;
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = Token::TOKEN_PUNCT;
                        $state = 2;
                        break;
                    }
                    $currentTokenCharacters[] = $text[$i];
                    break;
            }
        }
        $tokens[] = self::createToken($currentTokenType, 
            implode($currentTokenCharacters), 
            $currentTokenStartIndex, $i-1, 
            $currentTokenStartLine, $currentLine);
                
        return $tokens;
    }
    
    
}
