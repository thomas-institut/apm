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
use RuntimeException;
use ThomasInstitut\DataTable\InMemoryDataTable;
use APM\Core\Token\Normalizer\WitnessTokenNormalizer;
use APM\Core\Token\Normalizer\CompositeNormalizer;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\DataTable\RowDoesNotExist;

const FIELD_NAME = 'name';
const FIELD_LANG = 'lang';
const FIELD_CATEGORY = 'category';
const FIELD_NORMALIZER_OBJECT = 'normalizerObject';
const FIELD_METADATA = 'metadata';

class ApmNormalizerManager extends NormalizerManager
{

    private InMemoryDataTable $dt;

    public function __construct()
    {
        $this->dt = new InMemoryDataTable();
    }


    public function registerNormalizer(string $lang, string $category, string $name, WitnessTokenNormalizer $normalizer): void
    {
        if ($this->isNameAlreadyInUse($name))  {
            throw new InvalidArgumentException("Name '$name' already in use", self::ERROR_NAME_ALREADY_IN_USE);
        }

        if ($category === '') {
            throw new InvalidArgumentException("Category cannot be empty", self::ERROR_CATEGORY_CANNOT_BE_EMPTY);
        }

        try {
            $this->dt->createRow([
                FIELD_NAME => $name,
                FIELD_LANG => $lang,
                FIELD_CATEGORY => $category,
                FIELD_NORMALIZER_OBJECT => $normalizer,
                FIELD_METADATA => []
            ]);
        } catch (RowAlreadyExists $e) {
            // should NEVER happen
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }

    }

    /**
     * @param Token $token
     * @param string[] $normalizerNames
     * @return array
     */
    public function applyNormalizerList(Token $token, array $normalizerNames): array
    {
        $normalizers = [];
        foreach($normalizerNames as $name) {
            if ($this->isNameAlreadyInUse($name)) {
                $normalizers[] = $this->getNormalizerByName($name);
            }
        }
        return (new CompositeNormalizer($normalizers))->normalizeToken($token);
    }

    /**
     * @param Token $token
     * @param string $lang
     * @param string $category
     * @return Token[]
     */
    public function applyNormalizersByLangAndCategory(Token $token, string $lang, string $category): array
    {
        $normalizers = $this->getNormalizersByLangAndCategory($lang, $category);
        return (new CompositeNormalizer($normalizers))->normalizeToken($token);
    }

    public function getNormalizerByName(string $name) : WitnessTokenNormalizer {
        $rows = $this->dt->findRows([ FIELD_NAME => $name]);
        if (count($rows) === 0){
            throw new InvalidArgumentException("Normalized with name '$name' does not exist");
        }
        return $rows->getFirst()[FIELD_NORMALIZER_OBJECT];
    }

    private function isNameAlreadyInUse(string $name): bool
    {
        $rows = $this->dt->findRows([ FIELD_NAME => $name]);
        return count($rows) !== 0;
    }

    public function getNormalizersByLangAndCategory(string $lang, string $category) : array {
        $rows = $this->dt->findRows([ FIELD_LANG => $lang, FIELD_CATEGORY => $category]);
        return array_map( fn($row) =>  $row[FIELD_NORMALIZER_OBJECT], iterator_to_array($rows));
    }


    /**
     * @inheritDoc
     */
    public function setNormalizerMetadata(string $name, array $metaData): void
    {
        $rows = $this->dt->findRows([ FIELD_NAME => $name]);
        if (count($rows) === 0){
            throw new InvalidArgumentException("Normalized with name '$name' does not exist");
        }
        $id = $rows->getFirst()['id'];
        try {
            $this->dt->updateRow([
                'id' => $id,
                FIELD_METADATA => $metaData
            ]);
        } catch (InvalidRowForUpdate|RowDoesNotExist $e) {
            // should NEVER happen
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
    }

    public function getNormalizerMetadata(string $name): array
    {
        $rows = $this->dt->findRows([ FIELD_NAME => $name]);
        if (count($rows) === 0){
            throw new InvalidArgumentException("Normalized with name '$name' does not exist");
        }
        return $rows->getFirst()[FIELD_METADATA];
    }

    public function getNormalizerNamesByLangAndCategory(string $lang, string $category): array
    {
        $rows = $this->dt->findRows([ FIELD_LANG => $lang, FIELD_CATEGORY => $category]);
        return array_map( fn($row) =>  $row[FIELD_NAME], iterator_to_array($rows));
    }
}