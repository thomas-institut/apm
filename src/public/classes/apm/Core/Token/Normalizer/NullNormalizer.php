<?php


namespace APM\Core\Token\Normalizer;


use APM\Core\Token\NormalizationSource;
use APM\Core\Token\Token;

class NullNormalizer extends WitnessTokenNormalizer
{

    /**
     * @inheritDoc
     */
    public function normalizeToken(Token $token, bool $overwriteCurrentNormalization = false, string $source = NormalizationSource::DEFAULT): array
    {
        return [$token];
    }
}