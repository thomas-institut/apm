<?php


namespace APM\Core\Witness;


class TokenNormalizationsDecorator implements WitnessDecorator
{

    /**
     * @inheritDoc
     */
    public function getDecoratedTokens(Witness $w): array
    {
        $tokens = $w->getTokens();
        $decoratedTokens = [];

        foreach($tokens as $token) {
            $decoratedTokens[] = $token->getText() . " [" . $token->getNormalization() . "]";
         }

        return $decoratedTokens;

    }
}