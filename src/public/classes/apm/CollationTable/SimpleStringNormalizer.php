<?php


namespace APM\CollationTable;


use APM\Core\Token\Token;
use APM\Core\Token\TokenType;

abstract class SimpleStringNormalizer extends WitnessTokenNormalizer
{

    public function normalizeToken(Token $token, bool $overwriteCurrentNormalization = false): array
    {

//        return [new Token(TokenType::WORD, 'test', 'norm')];

        if ($token->getType() !== TokenType::WORD) {
            // don't do anything to non-word tokens
            return [ $token];
        }

        if (!$overwriteCurrentNormalization && $token->getText() !== $token->getNormalization()) {
            // do not overwrite
            return [ $token];
        }

        $normalizedToken = clone $token;

        $normalizedToken->setNormalization($this->normalizeString($token->getText()));

        return [ $normalizedToken ];
    }

    abstract public function normalizeString(string $str) : string;
}