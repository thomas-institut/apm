<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace APM\ToolBox;


use IntlChar;

class StringType
{

    static public function getValidPunctuationCharArray() : array {
        $theArray = [];
        $theArray[] = '.';
        $theArray[] = ',';
        $theArray[] = ';';
        $theArray[] = ':';
        $theArray[] = '?';
        $theArray[] = '!';
        $theArray[] = '⊙';
        $theArray[] = IntlChar::chr(0x61B); // Arabic semi-colon
        $theArray[] = IntlChar::chr(0x61F); // Arabic question mark
        $theArray[] = IntlChar::chr(0x60C); // Arabic comma
        $theArray[] = IntlChar::chr(0x60D); // Arabic date separator
        $theArray[] = IntlChar::chr(0x5BE); // Hebrew maqaf
        $theArray[] = IntlChar::chr(0x5C0); // Hebrew paseq
        $theArray[] = IntlChar::chr(0x5C3); // Hebrew soft pasuq
//        $theArray[] = IntlChar::chr(0x5F3); // Hebrew geresh
//        $theArray[] = IntlChar::chr(0x5F4); // Hebrew gershayim

        return $theArray;
    }

    static public function isWhiteSpace(string $char): bool
    {
        $wsRegExp = '^\s+$';
        return mb_ereg_match($wsRegExp, $char);
    }

    static public function hasWhiteSpace(string $char): bool
    {
        $wsRegExp = '.*\s';
        return mb_ereg_match($wsRegExp, $char);
    }

    /**
     * Returns true if the given strings consists only of valid
     * punctuation signs
     *
     * @param string $someString
     * @return int
     */
    static public function isPunctuation(string $someString) {
        for ($i = 0 ; $i < mb_strlen($someString); $i++) {
            if (array_search(mb_substr($someString, $i, 1), self::getValidPunctuationCharArray()) === false){
                return false;
            }
        }
        return true;
    }

    static public function hasPunctuation(string $someString): bool
    {
        for ($i = 0 ; $i < mb_strlen($someString); $i++) {
            if (array_search(mb_substr($someString, $i, 1), self::getValidPunctuationCharArray()) !== false){
                return true;
            }
        }
        return false;
    }

}