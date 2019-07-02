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

use APM\ArrayChecker\ArrayChecker;
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
    const INPUT_FIELD_COLLATION_TABLE = 'collationTable';
    const INPUT_FIELD_SIGLA_ABBREVIATIONS = 'siglaAbbreviations';
    const INPUT_FIELD_BASE_SIGLUM = 'baseSiglum';
    const INPUT_FIELD_TEXT_DIRECTION = 'textDirection';
    const INPUT_FIELD_LANGUAGE = 'language';

    // Token fields
    const TOKEN_FIELD_TYPE = 'type';
    const TOKEN_FIELD_TEXT = 'text';
    const TOKEN_FIELD_APPARATUS_HINT = 'apparatusHint';

    // edition fields
    const EDITION_FIELD_MAIN_TEXT_TOKENS = 'mainTextTokens';
    const EDITION_FIELD_BASE_SIGLUM = 'baseSiglum';
    const EDITION_FIELD_ABBREVIATIONS_TO_SIGLA = 'abbrToSigla';
    const EDITION_FIELD_TEXT_DIRECTION = 'textDirection';
    const EDITION_FIELD_EDITION_STYLE = 'editionStyle';
    const EDITION_FIELD_APPARATUS_ARRAY = 'apparatusArray';
    const EDITION_FIELD_ERROR = 'error';

    // edition token fields
    const E_TOKEN_FIELD_TYPE = 'type';
    const E_TOKEN_FIELD_TEXT = 'text';
    const E_TOKEN_FIELD_SPACE_WIDTH = 'space';
    const E_TOKEN_FIELD_COLLATION_TABLE_INDEX = 'collationTableIndex';

    // apparatus entry fields
    const APPARATUS_ENTRY_FIELD_START = 'start';
    const APPARATUS_ENTRY_FIELD_END = 'end';
    const APPARATUS_ENTRY_FIELD_TYPE = 'type';
    const APPARATUS_ENTRY_FIELD_SIGLA = 'sigla';
    const APPARATUS_ENTRY_FIELD_MARKDOWN = 'markDown';
    const APPARATUS_ENTRY_FIELD_TEXT = 'text';

    // text directions
    const TEXT_DIRECTION_RTL = 'rtl';
    const TEXT_DIRECTION_LTR = 'ltr';

    // Edition token types
    const E_TOKEN_TYPE_GLUE = 'glue';
    const E_TOKEN_TYPE_TEXT = 'text';

    // Space widths
    const SPACE_WIDTH_NORMAL = 'normal';

    // apparatus entry types
    const APPARATUS_ENTRY_TYPE_VARIANT = 'variant';
    const APPARATUS_ENTRY_TYPE_ADDITION = 'addition';
    const APPARATUS_ENTRY_TYPE_OMMISION = 'omission';



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
     *      tokenType uses the same constants as in the Token class, e.g., Token::TOKEN_EMPTY, etc
     *
     *  The returned array contains the following elements:
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
    public function generateEdition(array $input) : array {
        if (!$this->checkInput($input)) {
            // checkInput sets engine errors, just return an empty array
            return [];
        }
        $this->reset();
        $this->startChrono();
        $edition = $this->realGenerateEdition($input);
        $this->endChrono();
        return $edition;
    }

    /**
     * Real implementation of edition generation, provided by a descendant
     *

     * @param array $input
     * @return array
     */
    abstract protected function realGenerateEdition(array $input) : array;

    protected function checkInput(array $input) : bool {

        $inputCheckRules = [
            'requiredFields' => [
                [ 'name' => self::INPUT_FIELD_LANGUAGE, 'requiredType' => 'string'],
                [ 'name' => self::INPUT_FIELD_TEXT_DIRECTION, 'requiredType' => 'string'],
                [ 'name' => self::INPUT_FIELD_BASE_SIGLUM, 'requiredType' => 'string'],
                [ 'name' => self::INPUT_FIELD_SIGLA_ABBREVIATIONS, 'requiredType' => 'array'],
                [ 'name' => self::INPUT_FIELD_COLLATION_TABLE, 'requiredType' => 'array']
            ]
        ];

        $tokenCheckRules = [
            'requiredFields' => [
                ['name' => self::TOKEN_FIELD_TYPE, 'requiredType' => 'int'],
                ['name' => self::TOKEN_FIELD_TEXT, 'requiredType' => 'string']
            ]
        ];

        $checker = new ArrayChecker();

        if (!$checker->isArrayValid($input, $inputCheckRules)) {
            $this->setError(self::ERROR_BAD_INPUT, 'ArrayChecker error ' .
                $checker->getErrorCode() . ': ' . $checker->getErrorMessage());
            return false;
        }

        foreach ($input[self::INPUT_FIELD_COLLATION_TABLE] as $siglum => $tokens) {
            foreach ($tokens as $token) {
                if (!$checker->isArrayValid($token, $tokenCheckRules)) {
                    $this->setError(self::ERROR_BAD_INPUT, 'ArrayChecker error in token array ' .
                        $checker->getErrorCode() . ': ' . $checker->getErrorMessage());
                    return false;
                }
            }

        }
        return true;

    }

}