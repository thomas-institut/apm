<?php


namespace APM\Core\Token\Normalizer;


use IntlChar;

class IgnoreShaddaNormalizer extends SimpleStringNormalizer
{

    private ?string $shadda;

    public function __construct()
    {
        $this->shadda = IntlChar::chr(0x651);
    }

    /**
     * @inheritDoc
     */
    public function normalizeString(string $str): string
    {
        return str_replace($this->shadda, '', $str);
    }
}