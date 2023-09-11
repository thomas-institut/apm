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


namespace Test\APM\Mockup;

use APM\Core\Token\Normalizer\NullNormalizer;
use APM\Core\Token\Token;
use APM\System\NormalizerManager;

/**
 * Class MockNormalizerManager:  a normalizer that does not change anything, for testing
 * @package APM\Core\Token\Normalizer
 */
class MockNormalizerManager extends NormalizerManager
{

    /**
     * @var NullNormalizer
     */
    private NullNormalizer $nullNormalizer;

    public function __construct()
    {
        $this->nullNormalizer = new NullNormalizer();
    }

    public function registerNormalizer(string $lang, string $category, string $name, WitnessTokenNormalizer $normalizer)
    {

    }

    public function applyNormalizerList(Token $token, array $normalizerNames): array
    {
        return [$token];
    }

    public function applyNormalizersByLangAndCategory(Token $token, string $lang, string $category): array
    {
        return [$token];
    }

    public function getNormalizersByLangAndCategory(string $lang, string $category): array
    {
        return [];
    }

    public function getNormalizerNamesByLangAndCategory(string $lang, string $category): array
    {
        return [];
    }

    public function getNormalizerByName(string $name): WitnessTokenNormalizer
    {
        return $this->nullNormalizer;
    }

    /**
     * @inheritDoc
     */
    public function setNormalizerMetadata(string $name, array $metaData): void
    {

    }

    public function getNormalizerMetadata(string $name): array
    {
        return [];
    }
}