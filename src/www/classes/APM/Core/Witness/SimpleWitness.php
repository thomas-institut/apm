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
use APM\Core\Token\Normalizer\WitnessTokenNormalizer;
use APM\Core\Token\Token;

/**
 * SimpleWitness class
 * 
 * A witness simply composed of an array of tokens. This class exists mainly
 * for testing purposes.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SimpleWitness extends Witness {

    /**
     * @var Token[]
     */
    private array $tokens;
    
    public function __construct(string $work, string $chunk, array $tokens) {
        parent::__construct($work, $chunk);
        $this->tokens = $tokens;
        
    }

    public function getTokens() : array {
        return $this->tokens;
    }

    public function applyTokenNormalization(WitnessTokenNormalizer $normalizer, bool $overWriteCurrentNormalizations, string $source = NormalizationSource::DEFAULT)
    {
        $this->tokens = WitnessTokenNormalizer::normalizeTokenArray($this->tokens, $normalizer, $overWriteCurrentNormalizations, $source);
    }
}
