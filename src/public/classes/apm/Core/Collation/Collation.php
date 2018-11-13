<?php

/*
 * Copyright (C) 2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace APM\Core\Collation;


use APM\Core\Token\Token;
use APM\Core\Apparatus\ApparatusGenerator;
use APM\Core\Witness\Witness;

/**
 * Representation of a collation table
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Collation {
    
    const TOKENREF_NULL = -1;
    
    /* @var array */
    private $witnesses;
    
    /* @var array */
    private $collationTable;
    
    
    public function __construct() {
        $this->witnesses = [];
        $this->collationTable = [];
    }
    
    /**
     * Returns the number of tokens in the collation table
     * 
     * @return int
     */
    public function getTokenCount() {
        if (count($this->witnesses) === 0) {
            return 0;
        }
        $sigla = array_keys($this->witnesses);
        
        return count($this->collationTable[$sigla[0]]);
    }
    
    /**
     * Adds a witness to the collation with the given siglum
     * 
     * @param string $siglum
     * @param Witness $witness
     * @throws \InvalidArgumentException
     */
    public function addWitness(string $siglum, Witness $witness) {
        
        $tokenCount = count($witness->getTokens());
        if ($tokenCount === 0) {
            throw new \InvalidArgumentException('Cannot add empty witnesses');
        }
        
        $tokenRefs = [];
        for($i = 0; $i < $tokenCount; $i++) {
            $tokenRefs[] = $i;
        }
        
        $currentSize = $this->getTokenCount();
        
        
        if ($tokenCount < $currentSize) {
            // Pad the given array with empty tokens at the end
            for ($i = $tokenCount; $i < $currentSize; $i++) {
                $tokenRefs[] = self::TOKENREF_NULL;
            }
        }
        if ($tokenCount > $currentSize) {
            // Pad the existing witnesses
            $this->padCollationTableRowToSize($tokenCount);
        }
        $this->collationTable[$siglum] = $tokenRefs;
        $this->witnesses[$siglum] = $witness;
    }
    
    /**
     * Gets the column for the given index.
     * 
     * A collation table column is an associative array with one entry
     * for each witness: 
     *   $column = [  'siglumA' => someToken, 'siglumB' => otherToken, ... ]
     * 
     * @param int $index
     * @return array
     * @throws \InvalidArgumentException
     */
    public function getColumn(int $index) {
        $rawColumn = $this->getRawColumn($index);
        $column = [];
        foreach(array_keys($rawColumn) as $siglum) {
            /* ATTENTION: this might be extremely inefficient! */
            $ref = $rawColumn[$siglum];
            if ($ref === self::TOKENREF_NULL) {
                $column[$siglum] = Token::emptyToken();
                continue;
            }
            $column[$siglum] = $this->witnesses[$siglum]->getTokens()[$rawColumn[$siglum]];
        }
        return $column;
    }
    
    public function getRawColumn(int $index) : array {
        if ($index >= $this->getTokenCount()) {
            throw new \InvalidArgumentException('Index out of range');
        }
        $rawColumn = [];
        foreach(array_keys($this->collationTable) as $siglum) {
            $rawColumn[$siglum] = $this->collationTable[$siglum][$index];
        }
        return $rawColumn;
    }
    
    /**
     * Returns the tokens for the witness identified by the given siglum
     * 
     * @param string $siglum
     * @return Token[]
     */
    public function getWitnessTokens(string $siglum) : array {
        if (isset($this->witnesses[$siglum])) {
            return $this->witnesses[$siglum]->getTokens();
        }
        return [];
    }
    
    /**
     * Returns the sigla in the collation table
     * 
     * @return string[]
     */
    public function getSigla() {
        return array_keys($this->witnesses);
    }
    
    /**
     * Shifts the token at $index by $count positions for the witness
     * identified by the given $siglum by adding empty tokens.
     * Takes care of adding all the necessary
     * empty tokens at the end of the other witness so that the collation table 
     * is consistent
     * 
     * @param string $siglum
     * @param int $index
     * @param int $count
     * @return type
     */
    public function shiftToken(string $siglum, int $index, int $count) {
        $originalSize = count($this->collationTable[$siglum]);
        $firstPart = array_slice($this->collationTable[$siglum], 0, $index);
        $secondPart = array_slice($this->collationTable[$siglum], $index);
        for($i=0; $i<$count; $i++) {
            $firstPart[] = self::TOKENREF_NULL;
        }
        $this->collationTable[$siglum] = array_merge($firstPart, $secondPart);
        
        $newSize = count($this->collationTable[$siglum]);;
        // Deal with the extra tokens at the end
        for ($i = 0; $i < $count; $i++) {
            if ($this->collationTable[$siglum][$newSize-1] === self::TOKENREF_NULL) {
                // Last token is null, just pop it and return
                array_pop($this->collationTable[$siglum]);
                $newSize--;
            } else {
                // last token is not null, break the loop 
                break;
            }
        }
        if ($newSize !== $originalSize) {
            // need to pad the other witnesses
            $this->padCollationTableRowToSize($newSize);
        }
    }
    
    /**
     * Removes columns of empty tokens from the collation table
     */
    public function removeEmptyColumns() {
        $columnsToRemove = [];
        $tokenCount = $this->getTokenCount();
        for ($i=0; $i<$tokenCount;$i++) {
            $column = $this->getRawColumn($i);
            $columnIsEmpty = true;
            foreach($column as $ref) {
                if ($ref !== self::TOKENREF_NULL){
                    $columnIsEmpty = false;
                    break;
                } 
            }
            if ($columnIsEmpty) {
                $columnsToRemove[] = $i;
            }
        }
        foreach($columnsToRemove as $columnIndex) {
            $this->removeColumn($columnIndex);
        }
    }
    
    public function getApparatusEntryForColumn(int $columnIndex, string $mainReading, string $lemma = '') {
        $column = $this->getColumn($columnIndex);
        return ApparatusGenerator::genEntryForColumn($column, $mainReading, $lemma);
    }
    
    protected function padCollationTableRowToSize(int $newSize) {
        foreach($this->collationTable as &$collationTableRow) {
            $rowSize = count($collationTableRow);
            for ($i = $rowSize; $i < $newSize; $i++) {
                $collationTableRow[] = self::TOKENREF_NULL;
            }
        }
    }
    
    private function removeColumn(int $index) {
        foreach($this->collationTable as &$collationTableRow) {
            array_splice($collationTableRow, $index, 1);
        }
    }
    
}
