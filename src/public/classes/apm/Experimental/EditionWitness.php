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

namespace APM\Experimental;

use APM\Core\Collation\CollationTable;
use APM\EditionEngine\BasicEditionEngine;
use APM\EditionEngine\EditionEngine;

/**
 * Experimental class that provides methods to generate an
 * edition (main text plus apparatus) out of a collation table by designating
 * one of the witness as the base
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class EditionWitness {
    
    const SIGLA_STR_LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    const NO_GLUE_PUNCTUATION = '.,:;?!';
    
    const TOKEN_NOT_IN_MAINTEXT = -1;
    
    /**
     *
     * @var CollationTable
     */
    private $collationTable;
    
    /** @var string */
    private $language;
    
    /** @var bool */
    private $rightToLeft;

    /** @var string */
    private $baseSiglum;
    
    
    public function __construct(CollationTable $ct, string $baseSiglum, $lang = 'la') {
        $this->collationTable = $ct;
        $this->rightToLeft = false;
        $this->language = $lang;
        if ($lang === 'ar' || $lang === 'he') {
            $this->rightToLeft = true;
        }
        $this->baseSiglum = $baseSiglum;
    }
    
    /**
     * Generates an edition array from the internal 
     * collation table using $baseSiglum as the main text
     * 
     * The method returns an associative array with the following
     * elements:
     * 
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
     *       for now just passes the edition's language
     * 
     *   error: string,  non-empty if there's an error
     * 
     * @return  array
     */
    public function generateEdition() {
        // Associate sigla with abbreviations to use in the edition
        // TODO: support more than 26 witnesses!

        $siglumToAbbr = [];
        $currentSiglumIndex = 0;
        $siglaString = self::SIGLA_STR_LATIN;
        $sigla = $this->collationTable->getSigla();
        $baseSiglum = $this->baseSiglum;

        if (count($sigla) > mb_strlen($siglaString)) {
            return [ 'error' => 'Cannot handle this many witnesses'];
        }

        foreach($sigla as $siglum) {
            if ($siglum === $baseSiglum) {
                continue;
            }
            $abbr = mb_substr($siglaString, $currentSiglumIndex, 1);
            $siglumToAbbr[$siglum] = $abbr;
            $currentSiglumIndex++;
        }

        $ctForEngine = [];
        foreach ($sigla as $siglum ) {
            $ctForEngine[$siglum] = [];
            foreach($this->collationTable->getRow($siglum) as $ctToken) {
                $tokenForEngine = [];
                $tokenForEngine[EditionEngine::TOKEN_FIELD_TYPE] = $ctToken->getType();
                $tokenForEngine[EditionEngine::TOKEN_FIELD_TEXT] = $ctToken->getNormalization();
                $tokenForEngine[EditionEngine::TOKEN_FIELD_APPARATUS_HINT] = '';
                $ctForEngine[$siglum][] = $tokenForEngine;
            }
        }

        $editionEngineInput = [];
        $editionEngineInput[EditionEngine::INPUT_FIELD_LANGUAGE] = $this->language;
        $editionEngineInput[EditionEngine::INPUT_FIELD_TEXT_DIRECTION] = $this->rightToLeft ? 'rtl' : 'ltr';
        $editionEngineInput[EditionEngine::INPUT_FIELD_BASE_SIGLUM] = $baseSiglum;
        $editionEngineInput[EditionEngine::INPUT_FIELD_SIGLA_ABBREVIATIONS] = $siglumToAbbr;
        $editionEngineInput[EditionEngine::INPUT_FIELD_COLLATION_TABLE] = $ctForEngine;

        $engine = new BasicEditionEngine();

        $edition = $engine->generateEdition($editionEngineInput);

        $edition['extra'] = $engine->getRunDetails();

        return $edition;
    }
    
    
}
