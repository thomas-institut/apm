<?php


namespace APM\Core\Token\Normalizer;

/**
 * Test class
 * @package APM\Core\Token\Normalizer
 */
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