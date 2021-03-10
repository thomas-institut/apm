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



use APM\Core\Token\Token;
use InvalidArgumentException;
use ThomasInstitut\DataTable\InMemoryDataTable;
use APM\Core\Token\Normalizer\WitnessTokenNormalizer;
use APM\Core\Token\Normalizer\CompositeNormalizer;

const FIELD_NAME = 'name';
const FIELD_LANG = 'lang';
const FIELD_CATEGORY = 'category';
const FIELD_NORMALIZER_OBJECT = 'normalizerObject';

class ApmNormalizerManager extends NormalizerManager
{

    private InMemoryDataTable $dt;

    public function __construct()
    {
        $this->dt = new InMemoryDataTable();
    }

    public function registerNormalizer(string $lang, string $category, string $name, WitnessTokenNormalizer $normalizer)
    {
        if ($this->isNameAlreadyInUse($name))  {
            throw new InvalidArgumentException("Name '$name' already in use", self::ERROR_NAME_ALREADY_IN_USE);
        }

        if ($category === '') {
            throw new InvalidArgumentException("Category cannot be empty", self::ERROR_CATEGORY_CANNOT_BE_EMPTY);
        }

        $this->dt->createRow([
            FIELD_NAME => $name,
            FIELD_LANG => $lang,
            FIELD_CATEGORY => $category,
            FIELD_NORMALIZER_OBJECT => $normalizer
        ]);
    }

    /**
     * @param Token $token
     * @param string[] $normalizerNames
     */
    public function applyNormalizerList(Token $token, array $normalizerNames)
    {
        $normalizers = [];
        foreach($normalizerNames as $name) {
            if ($this->isNameAlreadyInUse($name)) {
                $normalizers[] = $this->getNormalizerByName($name);
            }
        }
        return (new CompositeNormalizer($normalizers))->normalizeToken($token, true);
    }

    public function applyNormalizersByLangAndCategory(Token $token, string $lang, string $category)
    {
        $normalizers = $this->getNormalizersByLangAndCategory($lang, $category);
        return (new CompositeNormalizer($normalizers))->normalizeToken($token, true);
    }

    private function getNormalizerByName(string $name) : WitnessTokenNormalizer {
        $rows = $this->dt->findRows([ FIELD_NAME => $name]);
        if (count($rows) === 0){
            throw new InvalidArgumentException("Normalized with name '$name' does not exist");
        }
        return $rows[0][FIELD_NORMALIZER_OBJECT];
    }

    private function isNameAlreadyInUse(string $name): bool
    {
        $rows = $this->dt->findRows([ FIELD_NAME => $name]);
        return count($rows) !== 0;
    }

    private function getNormalizersByLangAndCategory(string $lang, string $category) : array {
        $rows = $this->dt->findRows([ FIELD_LANG => $lang, FIELD_CATEGORY => $category]);
        return array_map( fn($row) =>  $row[FIELD_NORMALIZER_OBJECT], $rows);
    }

}