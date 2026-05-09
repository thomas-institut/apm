<?php


namespace APM\Test\System;

use APM\Core\Token\Normalizer\SimpleStringNormalizer;

class AddStringNormalizer extends SimpleStringNormalizer
{

    private string $stringToAdd;

    public function __construct(string $stringToAdd)
    {
        $this->stringToAdd = $stringToAdd;
    }

    /**
     * @inheritDoc
     */
    public function normalizeString(string $str): string
    {
        return $str . $this->stringToAdd;
    }
}