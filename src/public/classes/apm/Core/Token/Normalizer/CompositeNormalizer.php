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

/**
 * A WitnessTokenNormalizer that applies an array of other normalizers
 *
 * @package APM\CollationTable
 */
class CompositeNormalizer extends WitnessTokenNormalizer
{
    /**
     * @var WitnessTokenNormalizer[]
     */
    private array $normalizers;

    /**
     * CompositeNormalizer constructor.
     * @param WitnessTokenNormalizer[] $normalizers
     */
    public function __construct(array $normalizers)
    {
        $this->normalizers = $normalizers;
    }

    /**
     * @inheritDoc
     */
    public function normalizeToken(Token $token, bool $overwriteCurrentNormalization = false): array
    {
        $newToken = clone $token;
        foreach($this->normalizers as $normalizer) {
            $newToken = $normalizer->normalizeToken($newToken, $overwriteCurrentNormalization);
        }
        return $newToken;
    }
}