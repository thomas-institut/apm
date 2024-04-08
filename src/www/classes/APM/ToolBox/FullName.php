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

namespace APM\ToolBox;


/**
 * A collection of methods to analyze modern given names
 */
class FullName
{
    /**
     * Splits a full name into first and last names taking care of some
     * language conventions
     *
     * @param string $fullName
     * @return array
     */
    static public function analyze(string $fullName) : array {

        $commonPrefixes = ['de', 'la', 'von', 'van', 'della', 'al', 'ben', 'bin', 'of', 'abd'];

        $words = explode(' ', trim($fullName));

        // First, join common prefixes
        $names = [];
        for ($i = 0; $i < count($words); $i++) {
            $name = $words[$i];
            if (in_array(strtolower($words[$i]), $commonPrefixes)){
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

    static public function getWordInitials(string $name) : string {
        $initials = '';
        $words = explode(' ', $name);
        foreach($words as $word) {
            $initials .= mb_substr($word, 0, 1);
        }
        return $initials;
    }


    static public function getShortName(string $fullName) : string {

        $analyzedFullName = self::analyze($fullName);

        $subStrings = [];
        foreach($analyzedFullName['firstNames'] as $firstName) {
            $subStrings[] = self::getWordInitials($firstName) . '.';
        }

        foreach($analyzedFullName['lastNames'] as $lastName) {
            $subStrings[] = $lastName;
        }

        return implode(' ', $subStrings);
    }

    static public function getInitials(string $fullName): string {

        $analyzedFullName = self::analyze($fullName);

        $subStrings = [];
        foreach($analyzedFullName['firstNames'] as $firstName) {
            $subStrings[] = self::getWordInitials($firstName);
        }

        foreach($analyzedFullName['lastNames'] as $lastName) {
            $subStrings[] = self::getWordInitials($lastName);
        }

        return implode('', $subStrings);
    }

    static public function getSortName(string $name, bool $normalizeName) : string {
        if ($normalizeName) {
            $name = iconv('UTF-8', 'US-ASCII//TRANSLIT', $name);
        }
        $fullName = FullName::analyze($name);
        $sortName = implode(' ', $fullName['lastNames']);
        if (count($fullName['firstNames']) > 0) {
           $sortName .= ', ';
           $sortName .= implode(' ', $fullName['firstNames']);
        }
        return $sortName;
    }
}

