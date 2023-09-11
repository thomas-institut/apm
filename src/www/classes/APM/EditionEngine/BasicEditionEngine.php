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

use APM\StandardData\StandardTokenType;
use APM\ToolBox\StringType;

class BasicEditionEngine extends EditionEngine
{

    const TOKEN_NOT_IN_MAINTEXT = -1;

    const NO_GLUE_PUNCTUATION = '.,:;?!';

    const INDEX_BEFORE_MAIN_TEXT = -1;

    /**
     * @inheritDoc
     */
    public function generateEdition(array $input): array
    {

        $this->reset();
        $this->startChrono();

        $ctData = $input['collationTable'];
        $sigla = $ctData['sigla'];
        $baseWitnessIndex = 0;
        if (isset($input['baseWitnessIndex'])) {
            $baseWitnessIndex = intval($input['baseWitnessIndex']);
        }


        $language = $ctData['lang'];
        $textDirection = 'ltr';
        if ($language === 'ar' || $language === 'he') {
            $textDirection = 'rtl';
        }
        $mainTextInputTokens = $this->getWitnessTokensFromReferenceRow($ctData, $baseWitnessIndex);

        list ($mainTextTokens, $ctToMainTextMap) =
            $this->generateMainText($mainTextInputTokens);


        $criticalApparatus = [];
        foreach($ctToMainTextMap as $ctColumn => $mainTextIndex) {
            $column = $this->getCollationTableColumn($ctData, $ctColumn);
            if ($mainTextIndex === self::TOKEN_NOT_IN_MAINTEXT)  {
                // nothing on the main text for this token:
                //      find the previous token index that is in the main text,
                //      this is where the apparatus entry will appear
                $index = $ctColumn;
                while ($index >= 0 && ($ctToMainTextMap[$index] === self::TOKEN_NOT_IN_MAINTEXT ||
                        StringType::isPunctuation($mainTextTokens[$ctToMainTextMap[$index]][self::INPUT_TOKEN_FIELD_TEXT])) ) {
                    $index--;
                }
                if ($index < 0) {
                    $index = self::INDEX_BEFORE_MAIN_TEXT;
                }
                $additions = [];
                // collect variants in the row
                foreach($column as $witnessIndex => $ctToken) {
                    if ($witnessIndex === $baseWitnessIndex) {
                        continue;
                    }

                    if ($ctToken[self::INPUT_TOKEN_FIELD_TYPE] === StandardTokenType::EMPTY) {
                        continue;
                    }

                    if (!isset($additions[$ctToken[self::INPUT_TOKEN_FIELD_TEXT]])) {
                        $additions[$ctToken[self::INPUT_TOKEN_FIELD_TEXT]] = [];
                    }
                    $additions[$ctToken[self::INPUT_TOKEN_FIELD_TEXT]][] = $witnessIndex;
                }
                // build apparatus entries for each addition
                foreach($additions as $addition => $additionWitnessIndexes) {
                    $additionAbbreviations = [];
                    $additionAbbreviationsStr = '';
                    $details = [];
                    foreach ($additionWitnessIndexes as $additionWitnessIndex) {
                        $additionAbbreviations[] = $sigla[$additionWitnessIndex];
                        $additionAbbreviationsStr .= $sigla[$additionWitnessIndex];
                        $details[$additionWitnessIndex] = []; // TODO: fill details!
                    }
                    $entryMainTextIndex = ($index === self::INDEX_BEFORE_MAIN_TEXT) ? $index : $ctToMainTextMap[$index];
                    $criticalApparatus[] = [
                        self::APPARATUS_ENTRY_FIELD_START => $entryMainTextIndex,
                        self::APPARATUS_ENTRY_FIELD_END => $entryMainTextIndex,
                        self::APPARATUS_ENTRY_FIELD_TYPE  => self::APPARATUS_ENTRY_TYPE_ADDITION,
                        self::APPARATUS_ENTRY_FIELD_SIGLA => $additionWitnessIndexes, // TODO: change this, it's now an index, not a siglum
                        self::APPARATUS_ENTRY_FIELD_DETAILS => $details,
                        self::APPARATUS_ENTRY_FIELD_TEXT => $addition,
                        self::APPARATUS_ENTRY_FIELD_MARKDOWN => '+ ' . $addition .  ' _' . $additionAbbreviationsStr . '_'
                    ];
                }
                continue;
            }
            // token in main text
            // collect variants and omissions

            $mainText = $mainTextTokens[$ctToMainTextMap[$ctColumn]][self::INPUT_TOKEN_FIELD_TEXT];
            $variants = [];
            $omissions = [];
            if (!StringType::isPunctuation($mainText)) {
                foreach($column as $witnessIndex => $ctToken) {
                    if ($witnessIndex === $baseWitnessIndex) {
                        continue;
                    }
                    if ($ctToken[self::INPUT_TOKEN_FIELD_TYPE] === StandardTokenType::EMPTY) {
                        if (!isset($omissions[$mainText])) {
                            $omissions[$mainText] = [];
                        }
                        $omissions[$mainText][] = $witnessIndex;
                        continue;
                    }
                    $ctTokenText = $this->getTextFromInputToken($ctToken);
                    if ($ctTokenText !== $mainText) {
                        if (!isset($variants[$ctTokenText])) {
                            $variants[$ctTokenText] = [];
                        }
                        $variants[$ctTokenText][] = $witnessIndex;
                    }
                }
            }
            // generate entries
            foreach($omissions as $omissionText => $omissionWitnessIndexes) {
                $omissionAbbreviations = [];
                $omissionAbbreviationsStr = '';
                $details = [];
                foreach ($omissionWitnessIndexes as $omissionWitnessIndex) {
                    $omissionAbbreviations[] = $sigla[$omissionWitnessIndex];
                    $omissionAbbreviationsStr .= $sigla[$omissionWitnessIndex];
                    $details[$omissionWitnessIndex] = []; // TODO: fill details!
                }
                $criticalApparatus[] = [
                    self::APPARATUS_ENTRY_FIELD_START => $ctToMainTextMap[$ctColumn],
                    self::APPARATUS_ENTRY_FIELD_END => $ctToMainTextMap[$ctColumn],
                    self::APPARATUS_ENTRY_FIELD_TYPE => self::APPARATUS_ENTRY_TYPE_OMMISION,
                    self::APPARATUS_ENTRY_FIELD_SIGLA => $omissionWitnessIndexes, // TODO: change this, it's now an index, not a siglum
                    self::APPARATUS_ENTRY_FIELD_DETAILS => $details,
                    self::APPARATUS_ENTRY_FIELD_MARKDOWN => '-  _' . $omissionAbbreviationsStr . '_'
                ];
            }
            foreach($variants as $variant => $variantWitnessIndexes) {
                $variantAbbreviations = [];
                $variantAbbreviationsStr = '';
                $details = [];
                foreach ($variantWitnessIndexes as $variantWitnessIndex) {
                    $variantAbbreviations[] = $sigla[$variantWitnessIndex];
                    $variantAbbreviationsStr .= $sigla[$variantWitnessIndex];
                    $details[$variantWitnessIndex] = []; // TODO: fill details
                }
                $criticalApparatus[] = [
                    self::APPARATUS_ENTRY_FIELD_START => $ctToMainTextMap[$ctColumn],
                    self::APPARATUS_ENTRY_FIELD_END => $ctToMainTextMap[$ctColumn],
                    self::APPARATUS_ENTRY_FIELD_TYPE => self::APPARATUS_ENTRY_TYPE_VARIANT,
                    self::APPARATUS_ENTRY_FIELD_SIGLA => $variantWitnessIndexes, // it's indexes to the edition's sigla now
                    self::APPARATUS_ENTRY_FIELD_DETAILS => $details,
                    self::APPARATUS_ENTRY_FIELD_TEXT => $variant,
                    self::APPARATUS_ENTRY_FIELD_MARKDOWN => $variant .  ' _' . $variantAbbreviationsStr . '_'
                ];
            }
        }

        // TODO: Optimize apparatus

        // Just one apparatus for now
        $apparatusArray = [$criticalApparatus];

        $edition = [];
        $edition[self::EDITION_FIELD_BASE_WITNESS_INDEX] = $baseWitnessIndex;
        $edition[self::EDITION_FIELD_MAIN_TEXT_TOKENS] = $mainTextTokens;
        $edition[self::EDITION_FIELD_SIGLA] = $sigla;
        $edition[self::EDITION_FIELD_TEXT_DIRECTION] = $textDirection;
        $edition[self::EDITION_FIELD_EDITION_STYLE] = $language;
        $edition[self::EDITION_FIELD_APPARATUS_ARRAY] = $apparatusArray;
        $edition[self::EDITION_FIELD_ERROR] = '';
        $edition['status'] = 'OK';

        $this->endChrono();
        return $edition;
    }

    protected function getWitnessTokensFromReferenceRow(array $ctData, int $witnessIndex) : array {

        $tokens = [];
        foreach($ctData['collationMatrix'][$witnessIndex] as $tokenRef) {
            if ($tokenRef !== -1) {
                $tokens[] = $ctData['witnesses'][$witnessIndex]['tokens'][$tokenRef];
            } else {
                $tokens[] = [ self::INPUT_TOKEN_FIELD_TYPE => StandardTokenType::EMPTY];
            }

        }
        return $tokens;
    }

    /**
     * Generates an array with two elements:
     *   0: an array of tokens to typeset representing the main text
     *   1: an array of indices of the inputTokens to the array in 0
     * @param $inputTokens
     * @return array
     */
    protected function generateMainText($inputTokens) : array {
        $mainTextTokens = [];
        $firstWordAdded = false;
        $inputTokensToMainText = [];
        $currentMainTextIndex = -1;
        foreach($inputTokens as $inputIndex => $inputToken) {
            if ($inputToken[self::INPUT_TOKEN_FIELD_TYPE] === StandardTokenType::EMPTY ) {
                $inputTokensToMainText[] = self::TOKEN_NOT_IN_MAINTEXT;
                continue;
            }
            if ($inputToken[self::INPUT_TOKEN_FIELD_TYPE] === StandardTokenType::WHITESPACE ) {
                $inputTokensToMainText[] = self::TOKEN_NOT_IN_MAINTEXT;
                continue;
            }
            $addGlue = true;
            if (!$firstWordAdded) {
                $addGlue = false;
            }
            if (($inputToken[self::INPUT_TOKEN_FIELD_TYPE] === StandardTokenType::PUNCTUATION) &&
                (mb_strstr(self::NO_GLUE_PUNCTUATION, $inputToken[self::INPUT_TOKEN_FIELD_TEXT]) !== false ) ) {
                $addGlue = false;
            }
            if ($addGlue) {
                $currentMainTextIndex++;
                $mainTextTokens[] = [
                    self::E_TOKEN_FIELD_TYPE => self::E_TOKEN_TYPE_GLUE,
                    self::E_TOKEN_FIELD_SPACE_WIDTH => self::SPACE_WIDTH_NORMAL
                ];
            }
            $currentMainTextIndex++;
            $mainTextTokens[] = [
                self::E_TOKEN_FIELD_TYPE => self::E_TOKEN_TYPE_TEXT,
                self::E_TOKEN_FIELD_TEXT => $this->getTextFromInputToken($inputToken),
                self::E_TOKEN_FIELD_COLLATION_TABLE_INDEX => $inputIndex
            ];
            $firstWordAdded = true;
            $inputTokensToMainText[] = $currentMainTextIndex;
        }
        return [ $mainTextTokens, $inputTokensToMainText];
    }

    protected function getTextFromInputToken(array $token): string {
        return isset($token[self::INPUT_TOKEN_FIELD_NORMALIZED_TEXT]) ?
            $token[self::INPUT_TOKEN_FIELD_NORMALIZED_TEXT] :
            $token[self::INPUT_TOKEN_FIELD_TEXT];
    }



    protected function getCollationTableColumn(array $ctData, int $col) : array {
        $column = [];
        foreach($ctData['collationMatrix'] as $row => $tokenRefs) {
            $ref = $tokenRefs[$col];
            if ($ref === -1) {
                $column[$row] = [ self::INPUT_TOKEN_FIELD_TYPE => StandardTokenType::EMPTY];
            } else {
                $column[$row] = $ctData['witnesses'][$row]['tokens'][$ref];
            }
        }
        return $column;
    }
}