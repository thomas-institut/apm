<?php


namespace APM\Core\Token\Normalizer;


use IntlChar;

class IgnoreIsolatedHamzaNormalizer extends SimpleStringNormalizer
{
    private ?string $hamza;

    public function __construct()
    {
        $this->hamza = IntlChar::chr(0x621);
    }

    /**
     * @inheritDoc
     */
    public function normalizeString(string $str): string
    {
        return str_replace($this->hamza, '', $str);
    }
}