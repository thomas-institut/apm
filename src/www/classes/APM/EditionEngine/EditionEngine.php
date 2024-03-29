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

namespace APM\EditionEngine;


use APM\Engine\Engine;

abstract class EditionEngine extends  Engine
{

    // edition token fields
    const INPUT_TOKEN_FIELD_TYPE = 'tokenType';
    const INPUT_TOKEN_FIELD_TEXT = 'text';
    const INPUT_TOKEN_FIELD_NORMALIZED_TEXT = 'normalizedText';

    const E_TOKEN_FIELD_TYPE = 'type';
    const E_TOKEN_FIELD_TEXT = 'text';
    const E_TOKEN_FIELD_SPACE_WIDTH = 'space';
    const E_TOKEN_FIELD_COLLATION_TABLE_INDEX = 'collationTableIndex';

    // Space widths
    const SPACE_WIDTH_NORMAL = 'normal';

    // edition fields
    const EDITION_FIELD_MAIN_TEXT_TOKENS = 'mainTextTokens';
    const EDITION_FIELD_BASE_WITNESS_INDEX = 'baseWitnessIndex';
    const EDITION_FIELD_SIGLA = 'sigla';
    const EDITION_FIELD_TEXT_DIRECTION = 'textDirection';
    const EDITION_FIELD_EDITION_STYLE = 'editionStyle';
    const EDITION_FIELD_APPARATUS_ARRAY = 'apparatusArray';
    const EDITION_FIELD_ERROR = 'error';

    // Edition token types
    const E_TOKEN_TYPE_GLUE = 'glue';
    const E_TOKEN_TYPE_TEXT = 'text';

    // apparatus entry fields
    const APPARATUS_ENTRY_FIELD_START = 'start';
    const APPARATUS_ENTRY_FIELD_END = 'end';
    const APPARATUS_ENTRY_FIELD_TYPE = 'type';
    const APPARATUS_ENTRY_FIELD_SIGLA = 'sigla';
    const APPARATUS_ENTRY_FIELD_DETAILS = 'details';
    const APPARATUS_ENTRY_FIELD_MARKDOWN = 'markDown';
    const APPARATUS_ENTRY_FIELD_TEXT = 'text';

    // apparatus entry types
    const APPARATUS_ENTRY_TYPE_VARIANT = 'variant';
    const APPARATUS_ENTRY_TYPE_ADDITION = 'addition';
    const APPARATUS_ENTRY_TYPE_OMMISION = 'omission';

    /**
     * Generate an edition out of a standard input array:
     *
     * The input array may have following fields:
     *   - baseWitnessIndex:   optional, defaults to 0  (i.e., the first witness in the collation table)
     *   - collationTable : a standard collation table object (required)
     *    -siglaAbbreviations => [  'siglumA' => 'abbrA, 'siglumB' => 'abbrB', ... ] (optional)
     *
     * @param array $input
     * @return array
     */
    abstract public function generateEdition(array $input) : array;

}