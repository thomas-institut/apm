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


    /**
     * Normalizes an array of tokens with the given normalizer
     * @param array $tokenArray
     * @param WitnessTokenNormalizer $normalizer
     * @param bool $overwriteCurrentNormalizations
     * @return array
     */
    static public function normalizeTokenArray(array $tokenArray, WitnessTokenNormalizer $normalizer, bool $overwriteCurrentNormalizations) : array {

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