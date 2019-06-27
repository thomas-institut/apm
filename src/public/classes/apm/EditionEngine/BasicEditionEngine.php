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

        $siglumFromAbbr = [];
        //$currentSiglumIndex = 0;

        //$sigla = array_keys($input[EditionEngine::FIELD_COLLATION_TABLE]);
        $baseSiglum = $input[EditionEngine::FIELD_BASE_SIGLUM];
        $abbrFromSiglum = $input[EditionEngine::FIELD_SIGLA_ABBREVIATIONS];
        $language = $input[EditionEngine::FIELD_LANGUAGE];


        foreach($abbrFromSiglum as $siglum => $abbr) {
            $siglumFromAbbr[$abbr] = $siglum;
        }

        //  Generate main text
        $mainTextTokens = [];
        $ctTokens = $input[EditionEngine::FIELD_COLLATION_TABLE][$baseSiglum];
        $firstWordAdded = false;
        $ctToMainTextMap = [];
        $currentMainTextIndex = -1;
        foreach($ctTokens as $i => $ctToken) {
            if ($ctToken[EditionEngine::FIELD_TOKEN_TYPE] === Token::TOKEN_EMPTY ) {
                $ctToMainTextMap[] = self::TOKEN_NOT_IN_MAINTEXT;
                continue;
            }
            $addGlue = true;
            if (!$firstWordAdded) {
                $addGlue = false;
            }
            if (($ctToken[EditionEngine::FIELD_TOKEN_TYPE] ===Token::TOKEN_PUNCT) &&
                (mb_strstr(self::NO_GLUE_PUNCTUATION, $ctToken[EditionEngine::FIELD_TEXT]) !== false ) ) {
                $addGlue = false;
            }
            if ($addGlue) {
                $currentMainTextIndex++;
                $mainTextTokens[] = [ 'type' => EditionEngine::E_TOKEN_GLUE, 'space' => 'normal'];
            }
            $currentMainTextIndex++;
            $mainTextTokens[] = [
                'type' => EditionEngine::E_TOKEN_TEXT,
                'text' => $ctToken[EditionEngine::FIELD_TEXT],
                'collationTableIndex' => $i
            ];
            $firstWordAdded = true;
            $ctToMainTextMap[] = $currentMainTextIndex;
        }

        $criticalApparatus = [];
        foreach($ctToMainTextMap as $i => $mainTextIndex) {
            $column = $this->getCollationTableColumn($input[EditionEngine::FIELD_COLLATION_TABLE], $i);
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

                    if ($ctToken[EditionEngine::FIELD_TOKEN_TYPE] === Token::TOKEN_EMPTY) {
                        continue;
                    }

                    if (!isset($additions[$ctToken[EditionEngine::FIELD_TEXT]])) {
                        $additions[$ctToken[EditionEngine::FIELD_TEXT]] = [];
                    }
                    $additions[$ctToken[EditionEngine::FIELD_TEXT]][] = $siglum;
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
                        'start' => $ctToMainTextMap[$index],
                        'end' => $ctToMainTextMap[$index],
                        'type' => 'add',
                        'sigla' => $additionSigla,
                        'addition' => $addition,
                        'markDown' => '+ ' . $addition .  ' _' . $additionAbbreviationsStr . '_'
                    ];
                }
                continue;
            }
            // token in main text
            // collect variants and omissions

            $mainText = $mainTextTokens[$ctToMainTextMap[$i]][EditionEngine::FIELD_TEXT];
            $variants = [];
            $omissions = [];
            foreach($column as $siglum => $ctToken) {
                if ($siglum === $baseSiglum) {
                    continue;
                }
                $ctTokenText = $ctToken[EditionEngine::FIELD_TEXT];
                if ($ctToken[EditionEngine::FIELD_TOKEN_TYPE] === Token::TOKEN_EMPTY) {
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
                    $variantAbbreviations[] = $abbrFromSiglum[$variantSiglum];
                    $variantAbbreviationsStr .= $abbrFromSiglum[$variantSiglum];
                }
                $criticalApparatus[] = [
                    'start' => $ctToMainTextMap[$i],
                    'end' => $ctToMainTextMap[$i],
                    'type' => 'variant',
                    'sigla' => $variantSigla,
                    'addition' => $variant,
                    'markDown' => $variant .  ' _' . $variantAbbreviationsStr . '_'
                ];
            }
        }

        // TODO: Optimize apparatus

        // Just one apparatus for now
        $apparatusArray = [$criticalApparatus];

        $edition = [];
        $edition['base'] = $baseSiglum;
        $edition['mainTextTokens'] = $mainTextTokens;
        $edition['abbrToSigla'] = $siglumFromAbbr;
        $edition['textDirection'] = $input[EditionEngine::FIELD_TEXT_DIRECTION];
        $edition['editionStyle'] = $language;
        $edition['apparatusArray'] = $apparatusArray;
        $edition['error'] = '';

        return $edition;
    }

    protected function getCollationTableColumn(array $collationTable, int $i) : array {
        $column = [];
        foreach($collationTable as $siglum => $tokens) {
            $column[$siglum] = $tokens[$i];
        }
        return $column;
    }
}