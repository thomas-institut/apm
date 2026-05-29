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
            $text = $token->getText();
            $norm = $token->getNormalization();
            $source = $token->getNormalizationSource();
            if ($text === $norm) {
                $decoratedTokens[] = $text;
            } else {
                $decoratedTokens[] = "$text = $norm ($source)";
            }

         }

        return $decoratedTokens;

    }
}