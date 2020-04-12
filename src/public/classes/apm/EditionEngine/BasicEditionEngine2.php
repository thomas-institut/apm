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


use APM\Core\Token\TokenType;

class BasicEditionEngine2 extends EditionEngine2
{

    const TOKEN_NOT_IN_MAINTEXT = -1;

    const NO_GLUE_PUNCTUATION = '.,:;?!';

    /**
     * @inheritDoc
     */
    public function generateEdition(array $input): array
    {

        $this->reset();
        $this->startChrono();

        // TODO: Implement generateEdition() method.

        $ctData = $input['collationTable'];
        $baseWitnessIndex = 0;
        if (!isset($input['baseWitnessIndex'])) {
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


        $apparatusArray = [];

        $edition = [];
        //$edition[self::EDITION_FIELD_BASE_SIGLUM] = $baseSiglum;
        $edition[self::EDITION_FIELD_MAIN_TEXT_TOKENS] = $mainTextTokens;
        //$edition[self::EDITION_FIELD_ABBREVIATIONS_TO_SIGLA] = $siglumFromAbbr;
        $edition[self::EDITION_FIELD_TEXT_DIRECTION] = $textDirection;
        $edition[self::EDITION_FIELD_EDITION_STYLE] = $language;
        $edition[self::EDITION_FIELD_APPARATUS_ARRAY] = $apparatusArray;
        $edition[self::EDITION_FIELD_ERROR] = '';
        $edition['status'] = 'Almost there!';

        $this->endChrono();
        return $edition;
    }

    protected function getWitnessTokensFromReferenceRow(array $ctData, int $witnessIndex) : array {

        $tokens = [];
        foreach($ctData['collationMatrix'][$witnessIndex] as $tokenRef) {
            if ($tokenRef !== -1) {
                $tokens[] = $ctData['witnesses'][$witnessIndex]['tokens'][$tokenRef];
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
        foreach($inputTokens as $i => $inputToken) {
            if ($inputToken[self::INPUT_TOKEN_FIELD_TYPE] === TokenType::EMPTY ) {
                $inputTokensToMainText[] = self::TOKEN_NOT_IN_MAINTEXT;
                continue;
            }
            if ($inputToken[self::INPUT_TOKEN_FIELD_TYPE] === TokenType::WHITESPACE ) {
                $inputTokensToMainText[] = self::TOKEN_NOT_IN_MAINTEXT;
                continue;
            }
            $addGlue = true;
            if (!$firstWordAdded) {
                $addGlue = false;
            }
            if (($inputToken[self::INPUT_TOKEN_FIELD_TYPE] === TokenType::PUNCTUATION) &&
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
                self::E_TOKEN_FIELD_TEXT => $inputToken[self::INPUT_TOKEN_FIELD_TEXT],
                self::E_TOKEN_FIELD_COLLATION_TABLE_INDEX => $i
            ];
            $firstWordAdded = true;
            $inputTokensToMainText[] = $currentMainTextIndex;
        }
        return [ $mainTextTokens, $inputTokensToMainText];
    }
}