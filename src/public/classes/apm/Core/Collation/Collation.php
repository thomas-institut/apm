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

/**
 * Representation of a collation table
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Collation {
    
    /* @var $table array */
    private $witnesses;
    
    
    public function __construct() {
        $this->witnesses = [];
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
        
        return count($this->witnesses[$sigla[0]]);
    }
    
    /**
     * Adds a witness to the collation with the given siglum
     * 
     * @param string $siglum
     * @param array $tokens  Array of Core\Token\Token
     * @throws \InvalidArgumentException
     */
    public function addWitness(string $siglum, array $tokens) {
        
        if (count($tokens) === 0) {
            throw new \InvalidArgumentException('Cannot add empty witnesses');
        }
        
        $currentSize = $this->getTokenCount();
        $tokenCount = count($tokens);
        
        if ($tokenCount < $currentSize) {
            // Pad the given array with empty tokens at the end
            for ($i = $tokenCount; $i < $currentSize; $i++) {
                $tokens[] = Token::emptyToken();
            }
        }
        if ($tokenCount > $currentSize) {
            // Pad the existing witnesses
            $this->padWitnessesToSize($tokenCount);
        }
        $this->witnesses[$siglum] = $tokens;
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
        if ($index >= $this->getTokenCount()) {
            throw new \InvalidArgumentException('Index out of range');
        }
        $column = [];
        foreach($this->witnesses as $siglum => $tokens) {
            $column[$siglum] = $tokens[$index];
        }
        return $column;
    }
    
    /**
     * Returns the tokens for the witness identified by the given siglum
     * 
     * @param string $siglum
     * @return Token[]
     */
    public function getWitnessTokens(string $siglum) {
        if (isset($this->witnesses[$siglum])) {
            return $this->witnesses[$siglum];
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
        $firstPart = array_slice($this->witnesses[$siglum], 0, $index);
        $secondPart = array_slice($this->witnesses[$siglum], $index);
        $firstPart[] = Token::emptyToken();
        $this->witnesses[$siglum] = array_merge($firstPart, $secondPart);
        $newSize = count($this->witnesses[$siglum]);
        
        // Deal with the extra token at the end
        if ($this->witnesses[$siglum][$newSize-1]->isEmpty()) {
            // Last token is empty token, just pop it and return
            array_pop($this->witnesses[$siglum]);
            return;
        }
        // need to pad the other witnesses
        $this->padWitnessesToSize($newSize);
    }
    
    /**
     * Removes columns of empty tokens from the collation table
     */
    public function removeEmptyColumns() {
        $columnsToRemove = [];
        $tokenCount = $this->getTokenCount();
        for ($i=0; $i<$tokenCount;$i++) {
            $column = $this->getColumn($i);
            $columnIsEmpty = true;
            foreach($column as $token) {
                /* @var Token $token */
                if (!$token->isEmpty()){
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
    
    protected function padWitnessesToSize(int $newSize) {
        foreach($this->witnesses as &$witness) {
            $witnessSize = count($witness);
            for ($i = $witnessSize; $i < $newSize; $i++) {
                $witness[] = Token::emptyToken();
            }
        }
    }
    
    private function removeColumn(int $index) {
        foreach($this->witnesses as &$witness) {
            array_splice($witness, $index, 1);
        }
    }
    
}
