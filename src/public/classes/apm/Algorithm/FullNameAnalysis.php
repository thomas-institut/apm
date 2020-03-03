<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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


class FullNameAnalysis
{
    /**
     * Splits a full name into first and last names taking care of some
     * language conventions
     *
     * @param string $fullName
     * @return array
     */
    static public function analyzeFullName(string $fullName) : array {

        $commonPrefixes = ['de', 'la', 'von', 'van', 'della', 'al', 'ben', 'bin'];

        $words = explode(' ', $fullName);

        // First, join common prefixes
        $names = [];
        for ($i = 0; $i < count($words); $i++) {
            $name = $words[$i];
            if (array_search($words[$i], $commonPrefixes)!== false){
                if (isset($words[$i+1])) {
                    $name .= ' ' . $words[$i+1];
                    $i++;
                }
            }
            $names[] = $name;
        }

        $analyzedName = [ 'firstNames' => [], 'lastNames' => []];

        // Case by case implementation for now!
        if (count($names) === 1) {
            // Assume that the only name in the full Name is the last name
            $analyzedName['lastNames'][]= $names[0];
            return $analyzedName;
        }

        // Assume fullName = 'firstName lastName1 lastName2 lastName3'
        $analyzedName['firstNames'][]= $names[0];
        for ($i = 1; $i < count($names); $i++) {
            $analyzedName['lastNames'][]= $names[$i];
        }
        return $analyzedName;
    }

    static public function getInitial(string $name) : string {
        return mb_substr($name, 0, 1);
    }


    static public function getShortName(string $fullName) : string {

        $analyzedFullName = self::analyzeFullName($fullName);

        $subStrings = [];
        foreach($analyzedFullName['firstNames'] as $firstName) {
            $subStrings[] = self::getInitial($firstName);
        }

        foreach($analyzedFullName['lastNames'] as $lastName) {
            $subStrings[] = $lastName;
        }

        return implode(' ', $subStrings);
    }

    public function getInitials($fullName): string {

        $analyzedFullName = self::analyzeFullName($fullName);

        $subStrings = [];
        foreach($analyzedFullName['firstNames'] as $firstName) {
            $subStrings[] = self::getInitial($firstName);
        }

        foreach($analyzedFullName['lastNames'] as $lastName) {
            $subStrings[] = self::getInitial($lastName);
        }

        return implode('', $subStrings);
    }
}