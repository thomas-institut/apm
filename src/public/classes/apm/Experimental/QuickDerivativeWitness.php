<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace APM\Experimental;

use APM\Core\Collation\CollationTable;
use APM\Core\Token\Token;

/**
 * Experimental class that provides methods to generate an
 * edition (main text plus apparatus) out of a collation table by designating
 * one of the witness as the base
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class QuickDerivativeWitness {
    
    const SIGLA_STR_LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    const NO_GLUE_PUNCTUATION = '.,:?!';
    
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
    
    
    public function __construct(CollationTable $ct, $lang = 'la') {
        $this->collationTable = $ct;
        $this->rightToLeft = false;
        $this->language = $lang;
        if ($lang === 'ar' || $lang === 'he') {
            $this->rightToLeft = true;
        }
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
     * @param string $baseSiglum
     * @return  array
     */
    public function generateEdition(string $baseSiglum) {
        
       
        // Associate sigla with abbreviations to use in the edition
        // TODO: support more than 26 witnesses!
        $abbrToSiglum = [];
        $siglumToAbbr = [];
        $currentSiglumIndex = 0;
        $siglaString = self::SIGLA_STR_LATIN;
        $sigla = $this->collationTable->getSigla();
        
        if (count($sigla) > mb_strlen($siglaString)) {
            return [ 'error' => 'Cannot handle this many witnesses'];
        }
        
        foreach($sigla as $siglum) {
            if ($siglum === $baseSiglum) {
                continue;
            }
            $abbr = mb_substr($siglaString, $currentSiglumIndex, 1);
            $abbrToSiglum[$abbr] = $siglum;
            $siglumToAbbr[$siglum] = $abbr;
            
            $currentSiglumIndex++;
        }
        
        //  Generate main text
        $mainTextTokens = [];
        
        $ctTokens = $this->collationTable->getRow($baseSiglum);
        $firstWordAdded = false;
        $ctToMainTextMap = [];
        $currentMainTextIndex = -1;
        foreach($ctTokens as $i => $ctToken) {
            if ($ctToken->isEmpty() ) {
                $ctToMainTextMap[] = self::TOKEN_NOT_IN_MAINTEXT;
                continue;
            }
            $addGlue = true;
            if (!$firstWordAdded) {
                $addGlue = false;
            }
            if (($ctToken->getType() ===Token::TOKEN_PUNCT) && 
                   (mb_strstr(self::NO_GLUE_PUNCTUATION, $ctToken->getText()) !== false ) ) {
                $addGlue = false;
            }
            if ($addGlue) {
                $currentMainTextIndex++;
                $mainTextTokens[] = [ 'type' => 'glue', 'space' => 'normal'];
            }
            $currentMainTextIndex++;
            $mainTextTokens[] = [ 
                'type' => 'text', 
                'text' => $ctToken->getNormalization(),
                'collationTableIndex' => $i
                ];
            $firstWordAdded = true;
            $ctToMainTextMap[] = $currentMainTextIndex;
        }
        
        $criticalApparatus = [];
        foreach($ctToMainTextMap as $i => $mainTextIndex) {
            $row = $this->collationTable->getColumn($i);
            if ($mainTextIndex === self::TOKEN_NOT_IN_MAINTEXT)  {
                // nothing on the main text for this token: 
                //      find the previous token index that is in the main text,
                //      this is where the apparatus entry will appear
                $index = $i;
                while ($index >= 0 && $ctToMainTextMap[$index] === self::TOKEN_NOT_IN_MAINTEXT) {
                    $index--;
                }
                if ($index < 0) {
                    // We are before the start of the main text
                    // ignore for now
                    continue;
                }
                $variants = [];
                // collect variants in the row
                foreach($row as $siglum => $ctToken) {
                    if ($siglum === $baseSiglum) {
                        continue;
                    }
                    
                    if ($ctToken->isEmpty()) {
                        continue;
                    }
                    
                    if (!isset($variants[$ctToken->getNormalization()])) {
                        $variants[$ctToken->getNormalization()] = [];
                    }
                    $variants[$ctToken->getNormalization()][] = $siglum;
                }
                // build apparatus entries for each variant
                foreach($variants as $variant => $variantSigla) {
                    $variantAbbreviations = [];
                    $variantAbbreviationsStr = '';
                    foreach ($variantSigla as $variantSiglum) {
                        $variantAbbreviations[] = $siglumToAbbr[$variantSiglum];
                        $variantAbbreviationsStr .= $siglumToAbbr[$variantSiglum];
                    }
                    $criticalApparatus[] = [
                        'start' => $ctToMainTextMap[$index],
                        'end' => $ctToMainTextMap[$index],
                        'type' => 'add',
                        'sigla' => $variantSigla,
                        'addition' => $variant,
                        'markDown' => '+ ' . $variant .  ' _' . $variantAbbreviationsStr . '_'
                    ];
                }
                continue;
            }
            // token in main text
            // collect variants and omissions
            
            $mainText = $mainTextTokens[$ctToMainTextMap[$i]]['text'];
            $variants = [];
            $omissions = [];
            foreach($row as $siglum => $ctToken) {
                if ($siglum === $baseSiglum) {
                    continue;
                }
                $ctTokenNormalization = $ctToken->getNormalization();
                if ($ctToken->isEmpty()) {
                    if (!isset($omissions[$ctTokenNormalization])) {
                        $omissions[$ctTokenNormalization] = [];
                    }
                    $omissions[$ctTokenNormalization][] = $siglum;
                    continue;
                }
                if ($ctTokenNormalization !== $mainText) {
                    if (!isset($variants[$ctTokenNormalization])) {
                        $variants[$ctTokenNormalization] = [];
                    }
                    $variants[$ctTokenNormalization][] = $siglum;
                }
            }
            // generate entries
            foreach($omissions as $omissionText => $omissionSigla) {
                $omissionAbbreviations = [];
                $omissionAbbreviationsStr = '';
                foreach ($omissionSigla as $omissionSiglum) {
                    $variantAbbreviations[] = $siglumToAbbr[$omissionSiglum];
                    $variantAbbreviationsStr .= $siglumToAbbr[$omissionSiglum];
                }
                $criticalApparatus[] = [
                    'start' => $ctToMainTextMap[$i],
                    'end' => $ctToMainTextMap[$i],
                    'type' => 'omission',
                    'sigla' => $omissionSigla,
                    'markDown' => '-  _' . $omissionAbbreviationsStr . '_'
                ];
            }
            foreach($variants as $variant => $variantSigla) {
                $variantAbbreviations = [];
                $variantAbbreviationsStr = '';
                foreach ($variantSigla as $variantSiglum) {
                    $variantAbbreviations[] = $siglumToAbbr[$variantSiglum];
                    $variantAbbreviationsStr .= $siglumToAbbr[$variantSiglum];
                }
                $criticalApparatus[] = [
                    'start' => $ctToMainTextMap[$i],
                    'end' => $ctToMainTextMap[$i],
                    'type' => 'add',
                    'sigla' => $variantSigla,
                    'addition' => $variant,
                    'markDown' => $variant .  ' _' . $variantAbbreviationsStr . '_'
                ];
            }
        }
        
        // Optimize apparatus
        
        
        
        
        
        // Just one apparatus for now
        $apparatusArray = [$criticalApparatus];
        
        $edition = [];
        $edition['mainTextTokens'] = $mainTextTokens;
        $edition['abbrToSigla'] = $abbrToSiglum;
        $edition['textDirection'] = $this->rightToLeft ? 'rtl' : 'ltr';
        $edition['editionStyle'] = $this->language;
        $edition['apparatusArray'] = $apparatusArray;
        
        return $edition;
    }
    
    
}
