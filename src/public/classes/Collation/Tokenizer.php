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
    
    private static function isWhiteSpace(string $s) {
        if (trim($s) === '') {
            return true;
        }
        return false;
    }
    
    /**
     * Splits the given string into an array 
     * of strings of the following kinds:
     *  - whitespace
     *  - punctuation
     *  - words
     * @param string $text
     */
    public static function splitText(string $text) 
    {
        $tokens = [];
        $currentTokenCharacters = [];
        $currentTokenType = self::TOKEN_UNDEFINED;
        $state = 0;
        $wsRegExp = '/\s+/';
        $puntRegExp = '/[\.,;:\(\)\[\]¶⊙!]+/';
        
        for ($i=0; $i<strlen($text); $i++) {
            switch($state) {
                case 0:
                    if (preg_match($wsRegExp, $text[$i])) {
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_WS;
                        $state = 1;
                        break;
                    }
                    if (preg_match($puntRegExp, $text[$i])) {
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
                    if (preg_match($wsRegExp, $text[$i])) {
                        $currentTokenCharacters[] = $text[$i];
                        break;
                    }
                    if (preg_match($puntRegExp, $text[$i])) {
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
                    if (preg_match($wsRegExp, $text[$i])) {
                        $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_WS;
                        $state = 1;
                        break;
                    }
                    if (preg_match($puntRegExp, $text[$i])) {
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
                    if (preg_match($wsRegExp, $text[$i])) {
                        $tokens[] = [ 'type' => $currentTokenType, 'text' => implode($currentTokenCharacters)];
                        $currentTokenCharacters  = [];
                        $currentTokenCharacters[] = $text[$i];
                        $currentTokenType = self::TOKEN_WS;
                        $state = 1;
                        break;
                    }
                    if (preg_match($puntRegExp, $text[$i])) {
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
    
    public static function tokenize(array $items) 
    {
        // Get a list of strings 
        $texts = [];
        foreach($items as $item) {
            $t = $item->getText();
            if (self::isWhiteSpace($t)) {
                continue;
            }
            $n = $item->getAltText();
            $stringToken = [ 't' => trim($t), 'n' => '', 'type' => $item->type];
            if (!self::isWhiteSpace($n)) {
                $stringToken['n'] = trim($n);
            }
            $texts[] =  $stringToken;
        }
        
        // "explode" the strings
        $tokens = [];
        foreach($texts as $stringToken) {
            if ($stringToken['n'] !== '') {
                // not splitting items with alt text
                $tokens[] = $stringToken;
                continue;
            }
            $words = preg_split("/[\s]+/", $stringToken['t']);
            
            for ($i = 0; $i < count($words); $i++) {
                if (self::isWhiteSpace($words[$i])) {
                    continue;
                }
                $token = [ 't' => $words[$i], 'type' => $stringToken['type']];
                $tokens[] = $token;
            }
        }
        return $tokens;
    }
}
