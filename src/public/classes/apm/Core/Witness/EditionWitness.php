<?php


namespace APM\Core\Witness;


use APM\Core\Token\EditionToken;
use APM\Core\Token\NormalizationSource;
use APM\Core\Token\Normalizer\WitnessTokenNormalizer;
use APM\Core\Token\Token;
use APM\Core\Token\TokenType;

class EditionWitness extends Witness
{

    /**
     * @var EditionToken[]
     */
    private array $tokens;

    /**
     *
     * @param string $work
     * @param string $chunk
     * @param EditionToken[] $tokens
     */
    public function __construct(string $work, string $chunk, array $tokens = []) {
        parent::__construct($work, $chunk);
        $this->tokens = $tokens;
    }

    /**
     * @param Token[] $tokens
     * @return int[]  an array with a mapping from the input array index to the index in the Edition witness token array
     */
    public function setTokensFromNonEditionTokens(array $tokens) : array {
        $this->tokens = [];
        $inputToOutputMap = [];
        foreach ($tokens as $index => $token) {
            if ($token->getType() === TokenType::WHITESPACE) {
                // ignore whitespace tokens
                continue;
            }
            $this->tokens[] = EditionToken::newFromToken($token);
            $inputToOutputMap[] = $index;
        }
        return $inputToOutputMap;
    }
    /**
     * @inheritDoc
     */
    public function getTokens(): array
    {
        return $this->tokens;
    }

    public function applyTokenNormalization(WitnessTokenNormalizer $normalizer, bool $overWriteCurrentNormalizations, string $source = NormalizationSource::DEFAULT)
    {
        $this->tokenArray = WitnessTokenNormalizer::normalizeTokenArray($this->getTokens(), $normalizer, $overWriteCurrentNormalizations, $source);
    }
}