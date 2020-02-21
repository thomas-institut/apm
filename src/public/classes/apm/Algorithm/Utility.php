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

namespace APM\Algorithm;

/**
 * Utility Methods
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Utility {
    
    /**
     * Sorts an array by the given key
     * 
     * @param array $rows
     * @param string $key
     */
    public static function arraySortByKey(array &$rows, string $key)
    {
        usort(
            $rows, 
            function ($a, $b) use($key) {
                if (is_object($a)) {
                    $a = (array) $a;
                    $b = (array) $b;
                }
                return $a[$key] < $b[$key] ? -1 : 1;
            }
        );    
    }

    /**
     * Removes Byte Order Mark characters from a utf-8 encoded string
     *
     * @param string $utf8EncodedString
     * @return string
     */
    public static function removeBOMsFromString(string $utf8EncodedString) : string {
        return str_replace("\xEF\xBB\xBF",'',$utf8EncodedString);
    }
}
