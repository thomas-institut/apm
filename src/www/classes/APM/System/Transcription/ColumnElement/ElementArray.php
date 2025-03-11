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

namespace APM\System\Transcription\ColumnElement;

use APM\ToolBox\MyersDiff;

/**
 * Methods to manage an array of ColumnElements meant to be internally 
 * consistent (e.g., the kind of array interchanged with the 
 * TranscriptionEditor)
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ElementArray {
    /**
     * Gets the edit script that transform the array into the
     * given array.
     *
     * Assumes the elements (and their items) in both arrays are ordered according to
     * the desired sequences.
     *
     * @param Element[] $oldArray
     * @param Element[] $newArray
     * @return array|array[]
     */
    public static function getEditScript(array $oldArray, array $newArray): array
    {
        return MyersDiff::calculate(
            $oldArray,
            $newArray,
            function ($a, $b) { return Element::isElementDataEqual($a, $b, true, true);}
        );
    }
}
