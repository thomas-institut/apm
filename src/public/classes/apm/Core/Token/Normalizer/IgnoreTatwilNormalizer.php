<?php


namespace APM\Core\Token\Normalizer;


use IntlChar;

class IgnoreTatwilNormalizer extends SimpleStringNormalizer
{


    private ?string $tatwil;

    public function __construct()
    {
        $this->tatwil = IntlChar::chr(0x640);
    }

    /**
     * @inheritDoc
     */
    public function normalizeString(string $str): string
    {

        return str_replace($this->tatwil, '', $str);
    }
}