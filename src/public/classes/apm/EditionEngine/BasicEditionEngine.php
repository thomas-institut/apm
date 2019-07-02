<?php


namespace APM\EditionEngine;


use APM\Core\Token\Token;

class BasicEditionEngine extends EditionEngine
{
    const NO_GLUE_PUNCTUATION = '.,:;?!';

    const TOKEN_NOT_IN_MAINTEXT = -1;

    const ENGINE_NAME = 'Basic Edition Engine v0.1';

    public function __construct()
    {
        parent::__construct(self::ENGINE_NAME);
    }

    /**
     * Real implementation of edition generation, provided by a descendant
     *
     * @param array $input
     * @return array
     */
    protected function realGenerateEdition(array $input): array
    {
        $baseSiglum = $input[EditionEngine::INPUT_FIELD_BASE_SIGLUM];
        $abbrFromSiglum = $input[EditionEngine::INPUT_FIELD_SIGLA_ABBREVIATIONS];
        $language = $input[EditionEngine::INPUT_FIELD_LANGUAGE];


        $siglumFromAbbr = [];
        foreach($abbrFromSiglum as $siglum => $abbr) {
            $siglumFromAbbr[$abbr] = $siglum;
        }

        //  Generate main text
        list ($mainTextTokens, $ctToMainTextMap) =
            $this->generateMainText($input[EditionEngine::INPUT_FIELD_COLLATION_TABLE][$baseSiglum]);

        // Generate critical apparatus
        $criticalApparatus = [];
        foreach($ctToMainTextMap as $i => $mainTextIndex) {
            $column = $this->getCollationTableColumn($input[EditionEngine::INPUT_FIELD_COLLATION_TABLE], $i);
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
                $additions = [];
                // collect variants in the row
                foreach($column as $siglum => $ctToken) {
                    if ($siglum === $baseSiglum) {
                        continue;
                    }

                    if ($ctToken[EditionEngine::TOKEN_FIELD_TYPE] === Token::TOKEN_EMPTY) {
                        continue;
                    }

                    if (!isset($additions[$ctToken[EditionEngine::TOKEN_FIELD_TEXT]])) {
                        $additions[$ctToken[EditionEngine::TOKEN_FIELD_TEXT]] = [];
                    }
                    $additions[$ctToken[EditionEngine::TOKEN_FIELD_TEXT]][] = $siglum;
                }
                // build apparatus entries for each addition
                foreach($additions as $addition => $additionSigla) {
                    $additionAbbreviations = [];
                    $additionAbbreviationsStr = '';
                    foreach ($additionSigla as $additionSiglum) {
                        $additionAbbreviations[] = $abbrFromSiglum[$additionSiglum];
                        $additionAbbreviationsStr .= $abbrFromSiglum[$additionSiglum];
                    }
                    $criticalApparatus[] = [
                        self::APPARATUS_ENTRY_FIELD_START => $ctToMainTextMap[$index],
                        self::APPARATUS_ENTRY_FIELD_END => $ctToMainTextMap[$index],
                        self::APPARATUS_ENTRY_FIELD_TYPE  => self::APPARATUS_ENTRY_TYPE_ADDITION,
                        self::APPARATUS_ENTRY_FIELD_SIGLA => $additionSigla,
                        self::APPARATUS_ENTRY_FIELD_TEXT => $addition,
                        self::APPARATUS_ENTRY_FIELD_MARKDOWN => '+ ' . $addition .  ' _' . $additionAbbreviationsStr . '_'
                    ];
                }
                continue;
            }
            // token in main text
            // collect variants and omissions

            $mainText = $mainTextTokens[$ctToMainTextMap[$i]][EditionEngine::TOKEN_FIELD_TEXT];
            $variants = [];
            $omissions = [];
            foreach($column as $siglum => $ctToken) {
                if ($siglum === $baseSiglum) {
                    continue;
                }
                $ctTokenText = $ctToken[EditionEngine::TOKEN_FIELD_TEXT];
                if ($ctToken[EditionEngine::TOKEN_FIELD_TYPE] === Token::TOKEN_EMPTY) {
                    if (!isset($omissions[$mainText])) {
                        $omissions[$mainText] = [];
                    }
                    $omissions[$mainText][] = $siglum;
                    continue;
                }
                if ($ctTokenText !== $mainText) {
                    if (!isset($variants[$ctTokenText])) {
                        $variants[$ctTokenText] = [];
                    }
                    $variants[$ctTokenText][] = $siglum;
                }
            }
            // generate entries
            foreach($omissions as $omissionText => $omissionSigla) {
                $omissionAbbreviations = [];
                $omissionAbbreviationsStr = '';
                foreach ($omissionSigla as $omissionSiglum) {
                    $omissionAbbreviations[] = $abbrFromSiglum[$omissionSiglum];
                    $omissionAbbreviationsStr .= $abbrFromSiglum[$omissionSiglum];
                }
                $criticalApparatus[] = [
                    self::APPARATUS_ENTRY_FIELD_START => $ctToMainTextMap[$i],
                    self::APPARATUS_ENTRY_FIELD_END => $ctToMainTextMap[$i],
                    self::APPARATUS_ENTRY_FIELD_TYPE => self::APPARATUS_ENTRY_TYPE_OMMISION,
                    self::APPARATUS_ENTRY_FIELD_SIGLA => $omissionSigla,
                    self::APPARATUS_ENTRY_FIELD_MARKDOWN => '-  _' . $omissionAbbreviationsStr . '_'
                ];
            }
            foreach($variants as $variant => $variantSigla) {
                $variantAbbreviations = [];
                $variantAbbreviationsStr = '';
                foreach ($variantSigla as $variantSiglum) {
                    $variantAbbreviations[] = $abbrFromSiglum[$variantSiglum];
                    $variantAbbreviationsStr .= $abbrFromSiglum[$variantSiglum];
                }
                $criticalApparatus[] = [
                    self::APPARATUS_ENTRY_FIELD_START => $ctToMainTextMap[$i],
                    self::APPARATUS_ENTRY_FIELD_END => $ctToMainTextMap[$i],
                    self::APPARATUS_ENTRY_FIELD_TYPE => self::APPARATUS_ENTRY_TYPE_VARIANT,
                    self::APPARATUS_ENTRY_FIELD_SIGLA => $variantSigla,
                    self::APPARATUS_ENTRY_FIELD_TEXT => $variant,
                    self::APPARATUS_ENTRY_FIELD_MARKDOWN => $variant .  ' _' . $variantAbbreviationsStr . '_'
                ];
            }
        }

        // TODO: Optimize apparatus

        // Just one apparatus for now
        $apparatusArray = [$criticalApparatus];

        $edition = [];
        $edition[self::EDITION_FIELD_BASE_SIGLUM] = $baseSiglum;
        $edition[self::EDITION_FIELD_MAIN_TEXT_TOKENS] = $mainTextTokens;
        $edition[self::EDITION_FIELD_ABBREVIATIONS_TO_SIGLA] = $siglumFromAbbr;
        $edition[self::EDITION_FIELD_TEXT_DIRECTION] = $input[EditionEngine::INPUT_FIELD_TEXT_DIRECTION];
        $edition[self::EDITION_FIELD_EDITION_STYLE] = $language;
        $edition[self::EDITION_FIELD_APPARATUS_ARRAY] = $apparatusArray;
        $edition[self::EDITION_FIELD_ERROR] = '';

        return $edition;
    }

    protected function getCollationTableColumn(array $collationTable, int $i) : array {
        $column = [];
        foreach($collationTable as $siglum => $tokens) {
            $column[$siglum] = $tokens[$i];
        }
        return $column;
    }

    /**
     * Generates an array with two elements:
     *   0: an array of tokens to typeset representing the main text
     *   1: an array of indices of the inputTokens to the array in 0
     * @param $inputTokens
     * @return array
     */
    public function generateMainText($inputTokens) : array {
        $mainTextTokens = [];
        $firstWordAdded = false;
        $inputTokensToMainText = [];
        $currentMainTextIndex = -1;
        foreach($inputTokens as $i => $inputToken) {
            if ($inputToken[EditionEngine::TOKEN_FIELD_TYPE] === Token::TOKEN_EMPTY ) {
                $inputTokensToMainText[] = self::TOKEN_NOT_IN_MAINTEXT;
                continue;
            }
            if ($inputToken[EditionEngine::TOKEN_FIELD_TYPE] === Token::TOKEN_WHITESPACE ) {
                $inputTokensToMainText[] = self::TOKEN_NOT_IN_MAINTEXT;
                continue;
            }
            $addGlue = true;
            if (!$firstWordAdded) {
                $addGlue = false;
            }
            if (($inputToken[EditionEngine::TOKEN_FIELD_TYPE] ===Token::TOKEN_PUNCT) &&
                (mb_strstr(self::NO_GLUE_PUNCTUATION, $inputToken[EditionEngine::TOKEN_FIELD_TEXT]) !== false ) ) {
                $addGlue = false;
            }
            if ($addGlue) {
                $currentMainTextIndex++;
                $mainTextTokens[] = [
                    self::E_TOKEN_FIELD_TYPE => EditionEngine::E_TOKEN_TYPE_GLUE,
                    self::E_TOKEN_FIELD_SPACE_WIDTH => self::SPACE_WIDTH_NORMAL
                ];
            }
            $currentMainTextIndex++;
            $mainTextTokens[] = [
                self::E_TOKEN_FIELD_TYPE => EditionEngine::E_TOKEN_TYPE_TEXT,
                self::E_TOKEN_FIELD_TEXT => $inputToken[EditionEngine::TOKEN_FIELD_TEXT],
                self::E_TOKEN_FIELD_COLLATION_TABLE_INDEX => $i
            ];
            $firstWordAdded = true;
            $inputTokensToMainText[] = $currentMainTextIndex;
        }
        return [ $mainTextTokens, $inputTokensToMainText];
    }
}