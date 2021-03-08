<?php


namespace APM\CollationTable;


use APM\Core\Token\Token;

abstract class WitnessTokenNormalizer
{
    /**
     * Returns an array of tokens containing a normalization of the given token.
     * Normally the returned array will have only one element, but
     * there might be cases where a single token has to be expanded into multiple ones
     * @param Token $token
     * @param bool $overwriteCurrentNormalization
     * @return array
     */
    abstract public function normalizeToken(Token $token, bool $overwriteCurrentNormalization = false ) : array;


    static public function normalizeTokenArray(array $tokenArray, WitnessTokenNormalizer  $normalizer, bool $overwriteCurrentNormalizations) : array {

        $normalizedTokens = [];

        foreach($tokenArray as $token) {
            $normalizedArray = $normalizer->normalizeToken($token, $overwriteCurrentNormalizations);
            foreach($normalizedArray as $newToken) {
                $normalizedTokens[] = $newToken;
            }
        }
        return $normalizedTokens;
    }

}