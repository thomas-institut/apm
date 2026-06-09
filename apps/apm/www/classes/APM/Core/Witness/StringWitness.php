<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace APM\Core\Witness;

use APM\Core\Token\NormalizationSource;
use APM\Core\Token\StringToken;
use APM\Core\Token\StringTokenizer;
use APM\Core\Token\Token;
use InvalidArgumentException;
use APM\Core\Token\Normalizer\WitnessTokenNormalizer;

/**
 * A Witness whose source is a single text string.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class StringWitness extends Witness {
    
    private string $sourceString;

    /**
     * @var Token[]
     */
    private array $tokens;

    /**
     * StringWitness constructor.
     * @param string $work
     * @param string $chunk
     * @param string $text
     */
    public function __construct(string $work, string $chunk, string $text) {
        parent::__construct($work, $chunk);
        if ($text === '') {
            throw new InvalidArgumentException('String cannot be empty');
        }
        $this->sourceString = $text;
        $this->tokens = [];
    }

    /**
     * @return StringToken[]
     */
    public function getTokens() : array {
        if ($this->tokens === []) {
            $this->tokens = (new StringTokenizer())->getTokensFromString($this->sourceString);
        }
        return $this->tokens;
    }

    /**
     * Returns the witness' source string
     *
     * @return string
     */
    public function getSourceString() : string {
        return $this->sourceString;
    }

    public function applyTokenNormalization(WitnessTokenNormalizer $normalizer, bool $overWriteCurrentNormalizations,
                                            string $source = NormalizationSource::DEFAULT)
    {
        $this->tokens = WitnessTokenNormalizer::normalizeTokenArray($this->getTokens(), $normalizer, $overWriteCurrentNormalizations, $source);
    }

    public function getData(): array
    {
        $data =  parent::getData();

        $data['tokens'] = [];

        foreach($this->tokens as $token) {
            $data['tokens'][] = $token->getData();
        }

        return $data;
    }

}
