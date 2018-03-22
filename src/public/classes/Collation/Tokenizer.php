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
namespace AverroesProject\Collation;

use AverroesProject\TxText\Item;

/**
 * Description of Tokenizer
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Tokenizer {
    
    const TOKEN_UNDEFINED = 0;
    const TOKEN_WORD = 1;
    const TOKEN_WS = 2;
    const TOKEN_PUNCT = 3;
    
    private static function mbStringToArray ($string) { 
        $strlen = mb_strlen($string); 
        while ($strlen) { 
            $array[] = mb_substr($string,0,1,"UTF-8"); 
            $string = mb_substr($string,1,$strlen,"UTF-8"); 
            $strlen = mb_strlen($string); 
        } 
        return $array; 
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
    public static function splitText(string $theText) : array
    {
        $tokens = [];
        $currentTokenCharacters = [];
        $currentTokenType = self::TOKEN_UNDEFINED;
        $state = 0;
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
                        $currentTokenType = self::TOKEN_WS;
                        $state = 1;
                        break;
                    }
                    if (mb_ereg($puntRegExp, $text[$i])) {
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_PUNCT;
                        $state = 2;
                        break;
                    }
                    $currentTokenCharacters[] = $text[$i];
                    $currentTokenType = self::TOKEN_WORD;
                    $state = 3;
                    break;
                
                case 1:
                    // State 1: Processing white space
                    if (mb_ereg($wsRegExp, $text[$i])) {
                        $currentTokenCharacters[] = $text[$i];
                        break;
                    }
                    if (mb_ereg($puntRegExp, $text[$i])) {
                        $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_PUNCT;
                        $state = 2;
                        break;
                    }
                    $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                    $currentTokenCharacters  = [];
                    $currentTokenCharacters[] = $text[$i];
                    $currentTokenType = self::TOKEN_WORD;
                    $state = 3;
                    break;
                    
                case 2:
                    // State 2: processing punctuation
                    if (mb_ereg($wsRegExp, $text[$i])) {
                        $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_WS;
                        $state = 1;
                        break;
                    }
                    if (mb_ereg($puntRegExp, $text[$i])) {
                        // punctuation characters generate one token per character
                        $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_PUNCT;
                        break;
                    }
                    $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                    $currentTokenCharacters  = [];
                    $currentTokenCharacters[] = $text[$i];
                    $currentTokenType = self::TOKEN_WORD;
                    $state = 3;
                    break;
                    
                case 3: 
                    // State 3: processing a word
                    if (mb_ereg($wsRegExp, $text[$i])) {
                        $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_WS;
                        $state = 1;
                        break;
                    }
                    if (mb_ereg($puntRegExp, $text[$i])) {
                        $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_PUNCT;
                        $state = 2;
                        break;
                    }
                    $currentTokenCharacters[] = $text[$i];
                    break;
            }
        }
        $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
        return $tokens;
    }
    
    
    /**
     * Produces an array of tokens suitable for use in Collatex out
     * of an array of Items
     * @param array $items
     * @return array
     */
    public static function tokenize(array $items) : array
    {
        $tokens = [];
        $currentToken = null;
        $noWordBreakFound = false;
        foreach ($items as $item) {
            if ($item->type === \AverroesProject\TxText\Item::NO_WORD_BREAK) {
                $noWordBreakFound = true;
                continue;
            }
            switch($item->type) {
                case Item::SIC:
                case Item::ABBREVIATION:
                    // The text for SIC and ABBREVIATION is the correction/expansion
                    // if it exists
                    if ($item->altText !== '' ){
                        $text = $item->altText;
                        $altText = $item->getText();
                    } else {
                        $text = $item->getText();
                        $altText = '';
                    }
                    break;
                
                default:
                    $text = $item->getText();
                    $altText = '';
                    break;
            }
            
            if ($text === '') {
                // this should not happen, it means that
                // an item has no text, which would have been caught
                // in the item's constructor
                // cannot reproduce in testing
                continue; // @codeCoverageIgnore  
            }
            $textTokens = self::splitText($text);
            foreach ($textTokens as $textToken) {
                switch($textToken['type']) {
                    case self::TOKEN_WS:
                        if ($noWordBreakFound) {
                            // skip over white space
                            break;
                        }
                        if (!is_null($currentToken)) {
                            $tokens[] = $currentToken;
                        }
                        $currentToken = null;
                        break;
                        
                    case self::TOKEN_WORD:
                        if ($noWordBreakFound) {
                            // reset noWordBreak flag
                            $noWordBreakFound = false;
                        }
                        if (is_null($currentToken)) {
                            $currentToken = [ 't' => $textToken['text'], 'itemType' => $item->type, 'tokenType' => self::TOKEN_WORD];
                            break;
                        }
                        if ($currentToken['tokenType'] === self::TOKEN_WORD) {
                            // two words in a row, add the texts
                            // TODO: deal with different item types
                            $currentToken['t'] .= $textToken['text'];
                            break;
                        }
                        // current token is not TOKEN_WORD  (i.e, it is TOKEN_PUNCT)
                        // so push current token into token list 
                        // and start a new current token
                        $tokens[] = $currentToken;
                        $currentToken = [ 't' => $textToken['text'], 'itemType' => $item->type, 'tokenType' => self::TOKEN_WORD];
                        break;
                        
                    case self::TOKEN_PUNCT:
                        if ($noWordBreakFound) {
                            // reset  noWordBreak flag
                            $noWordBreakFound = false;
                        }
                        if (is_null($currentToken)) {
                            $currentToken = [ 't' => $textToken['text'], 'itemType' => $item->type, 'tokenType' => self::TOKEN_PUNCT];
                            break;
                        }
                        // Punctuation tokens always force a new token, so push current token into token list
                        // and start a new current token
                        $tokens[] = $currentToken;
                        $currentToken = [ 't' => $textToken['text'], 'itemType' => $item->type, 'tokenType' => self::TOKEN_PUNCT];
                        break;

                }
            }
        }
        // push last token if not null
        if (!is_null($currentToken)) {
            $tokens[] = $currentToken;
        }
        
        return $tokens;
    }
}
