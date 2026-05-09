<?php
/*
 *  Copyright (C) 2021 Universität zu Köln
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

namespace APM\Core\Token\Normalizer;


use APM\Core\Token\NormalizationSource;
use APM\Core\Token\Token;
use APM\Core\Token\TokenType;

/**
 * A WitnessTokenNormalizer that transforms the text of WORD tokens with a function
 * Class SimpleStringNormalizer
 * @package APM\CollationTable
 */
abstract class SimpleStringNormalizer extends WitnessTokenNormalizer
{

    public function normalizeToken(Token $token, bool $overwriteCurrentNormalization = false, string $source = NormalizationSource::DEFAULT): array
    {
        if ($token->getType() !== TokenType::WORD) {
            // don't do anything to non-word tokens
            return [ $token];
        }
        $stringToNormalize = $token->getNormalization();
        if ($overwriteCurrentNormalization) {
            $stringToNormalize = $token->getText();
        }

        $normalizedToken = clone $token;
        $normalizedToken->setNormalization($this->normalizeString($stringToNormalize), $source);
        return [ $normalizedToken ];
    }

    /**
     * The actual normalization function to be provided by descendants of this class
     * @param string $str
     * @return string
     */
    abstract public function normalizeString(string $str) : string;
}