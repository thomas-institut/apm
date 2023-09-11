<?php


namespace APM\Core\Token\Normalizer;


use IntlChar;

class IgnoreArabicVocalizationNormalizer extends SimpleStringNormalizer
{

    private array $arabicVowelDiacritics;

    public function __construct()
    {
        $this->arabicVowelDiacritics = [
            IntlChar::chr(0x64B),
            IntlChar::chr(0x64C),
            IntlChar::chr(0x64D),
            IntlChar::chr(0x64E),
            IntlChar::chr(0x64F),
            IntlChar::chr(0x650),
            IntlChar::chr(0x652)
        ];
    }

    /**
     * @inheritDoc
     */
    public function normalizeString(string $str): string
    {
        return str_replace($this->arabicVowelDiacritics, "", $str);
    }
}