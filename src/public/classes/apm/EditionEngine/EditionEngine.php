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

namespace APM\EditionEngine;

use APM\Engine\Engine;

/**
 * Base class for edition engines
 *
 * An edition engine is a class that can automatically generate a traditional style edition
 * (i.e., main text plus apparatus) out of a collation table.
 */
abstract class EditionEngine extends Engine  {

    // error codes
    const ERROR_BAD_INPUT = 1001;


    // input array fields
    const FIELD_COLLATION_TABLE = 'collationTable';
    const FIELD_SIGLA_ABBREVIATIONS = 'siglaAbbreviations';
    const FIELD_BASE_SIGLUM = 'baseSiglum';
    const FIELD_TEXT_DIRECTION = 'textDirection';
    const FIELD_LANGUAGE = 'language';

    const TEXT_DIRECTION_RTL = 'rtl';
    const TEXT_DIRECTION_LTR = 'ltr';

    // Token fields
    const FIELD_TOKEN_TYPE = 'tokenType';
    const FIELD_TEXT = 'text';
    const FIELD_APPARATUS_HINT = 'apparatusHint';

    // Edition token types
    const E_TOKEN_GLUE = 'glue';
    const E_TOKEN_TEXT = 'text';



    /**
     *  Generates an edition (main text + critical apparatus) out of a simplified collation table
     *
     * The input array should have following fields:
     *   - baseSiglum:  siglum corresponding to the main text
     *   - textDirection: rtl | ltr
     *   - language: 'la' | 'ar' | 'he'
     *   - collationTable : an array of arrays of token information:
     *         [ 'siglumA' =>  [
     *              ['tokenType' => <type>, 'text' => 'sometext, 'apparatusHint'  => <hint>, ... ],
     *              ['tokenType' => <type>, 'text' => 'sometext, 'apparatusHint'  => <hint>, ... ],
     *              ... ],
     *           'siglumB => [ .... ]
     *    -siglaAbbreviations => [  'siglumA' => 'abbrA, 'siglumB' => 'abbrB', ... ]
     *
     *
     *
     * @param array $input
     * @return array
     */
    public function generateEdition(array $input) : array {
        if (!$this->checkInput($input)) {
            // checkInput sets engine errors, just return an empty array
            return [];
        }
        $this->startChrono();
        $this->reset();
        $edition = $this->realGenerateEdition($input);
        $this->endChrono();
        return $edition;
    }

    /**
     * Real implementation of edition generation, provided by a descendant
     *
     *  The returned array must contain:
     *   mainTextTokens : array of tokens to typeset, including spaces (a.k.a. glue)
     *       the tokens here are the kind of tokens the javascript typesetter
     *       expects to see.
     *
     *   abbrToSigla: associative array that maps the abbreviations used in the
     *       edition to the witnesses' sigla in the collation table
     *
     *   apparatusArray : array of arrays, one for each of the apparatus
     *      each apparatus is an array of entries containing the following
     *      information:
     *          start: index to the starting mainTextToken
     *          end: index to the final mainTextToken
     *          markDown: string, markDown formatted text of the entry
     *
     *   textDirection:  'ltr' | 'rtl'
     *
     *   editionStyle: string, a styling hint/directive to the edition viewer
     *
     *   error: string,  non-empty if there's an error
     *
     * @param array $input
     * @return array
     */
    abstract protected function realGenerateEdition(array $input) : array;

    protected function checkInput(array $input) : bool {

        $requiredFields = [
            self::FIELD_LANGUAGE,
            self::FIELD_TEXT_DIRECTION,
            self::FIELD_BASE_SIGLUM,
            self::FIELD_SIGLA_ABBREVIATIONS,
            self::FIELD_COLLATION_TABLE
        ];



        return true;
    }

}