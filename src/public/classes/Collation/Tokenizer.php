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
    
    private static function isWhiteSpace(string $s) {
        if (trim($s) === '') {
            return true;
        }
        return false;
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
            $stringToken = [ 't' => $t, 'n' => ''];
            if (!self::isWhiteSpace($n)) {
                $stringToken['n'] = $n;
            }
            $texts[] =  $stringToken;
        }
        
        // "explode" the strings
        $tokens = [];
        foreach($texts as $stringToken) {
            $words = preg_split("/[\s]+/", $stringToken['t']);
            $wordsN = [];
            if ($stringToken['n'] !== '') {
                $wordsN = preg_split("/[\s]+/", $stringToken['n']);
                if (count($words) !== count($wordsN)) {
                    return false;
                }
            }
            for ($i = 0; $i < count($words); $i++) {
                if (self::isWhiteSpace($words[$i])) {
                    continue;
                }
                $token = [ 't' => $words[$i]];
                if ($stringToken['n'] !== '') {
                    $token['n'] = $wordsN[$i];
                }
                $tokens[] = $token;
            }
        }
        return $tokens;
    }
}
