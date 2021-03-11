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

namespace APM\System;



use APM\Core\Token\Normalizer\WitnessTokenNormalizer;
use APM\Core\Token\Token;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;

/**
 * Class NormalizerManager
 *
 * Maintains a list of normalizers by language and category and provides utility functions to apply
 * normalizers in bulk
 *
 * @package APM\System
 */
abstract class NormalizerManager implements LoggerAwareInterface, CodeDebugInterface {

    const ERROR_NAME_ALREADY_IN_USE = 1001;
    const ERROR_CATEGORY_CANNOT_BE_EMPTY = 1002;

    use LoggerAwareTrait, CodeDebugWithLoggerTrait;

    abstract public function registerNormalizer(string $lang, string $category, string $name, WitnessTokenNormalizer $normalizer);
    abstract public function applyNormalizerList(Token $token, array $normalizerNames);
    abstract public function applyNormalizersByLangAndCategory(Token $token, string $lang, string $category);

    /**
     * Stores metadata for the given named normalizer, e.g:
     *   [ 'title' => 'Some nice title', 'help' => 'A more thorough explanation' ]
     * @param string $name
     * @param array $metaData  any array with standard types (string, int, float)
     * @return void
     */
    abstract public function setNormalizerMetadata(string $name, array $metaData) : void;
    abstract public function getNormalizerMetadata(string $name) : array;

}