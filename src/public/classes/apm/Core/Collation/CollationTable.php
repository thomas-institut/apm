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
class CollationTable {
    
    const TOKENREF_NULL = -1;
    const COLLATIONENGINE_NULL_TOKEN = '---';
    
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
    
    public function getWitnessCollationRawTokens(string $siglum) : array {
        return $this->collationTable[$siglum];
    }
    
    
    public function getWitnessCollationTokens(string $siglum) : array {
        $rawCollationTokens = $this->getWitnessCollationRawTokens($siglum);
        $witnessTokens = $this->getWitnessTokens($siglum);
        
        $collationTokens = [];
        foreach ($rawCollationTokens as $collationTokenRef) {
            if ($collationTokenRef === self::TOKENREF_NULL) {
                $collationTokens[] = Token::emptyToken();
                continue;
            }
            $collationTokens[] = $witnessTokens[$collationTokenRef];
        }
        return $collationTokens;
    }
    
    public function getCollationTable() : array {
        $table = [];
        foreach (array_keys($this->witnesses) as $siglum) {
            $table[$siglum] = $this->getWitnessCollationTokens($siglum);
        }
        return $table;
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
    
    /**
     * Generates an array that can be used as input to
     * an automatic collation engine
     * 
     */
    public function getCollationEngineInput() : array {
         
        $collationEngineWitnesses = [];
        foreach($this->witnesses as $siglum => $witness) {
            $collationEngineTokens = [];
            $witnessTokens = $witness->getTokens();
            foreach($this->collationTable[$siglum] as $columnNumber => $ref) {
                $collationEngineToken = [];
                $collationEngineToken['witnessRef'] = $ref;
                if ($ref === self::TOKENREF_NULL) {
                    $collationEngineToken['t'] = self::COLLATIONENGINE_NULL_TOKEN;
                    $collationEngineTokens[] = $collationEngineToken;
                    continue;
                }
                $witnessToken = $witnessTokens[$ref];
                $collationEngineToken['t'] = $witnessToken->getText();
                if ($witnessToken->getNormalization() !== $witnessToken->getText()) {
                    $collationEngineToken['n'] = $witnessToken->getNormalization();
                }
                $collationEngineTokens[] = $collationEngineToken;
            }
            // Trim null tokens at the end of token Array
            while ($collationEngineTokens[count($collationEngineTokens)-1]['witnessRef'] === self::TOKENREF_NULL) {
                array_pop($collationEngineTokens);
            }
            $collationEngineWitnesses[] = [ 
                'id' => $siglum,
                'tokens' => $collationEngineTokens
            ];
        }
        return $collationEngineWitnesses;
    }
    
    public function setCollationTableFromCollationEngineOutput(array $collationEngineOutput) {
        // First, check that the input is a valid collation engine output
        if (!isset($collationEngineOutput['table']) || !isset($collationEngineOutput['witnesses'])) {
            throw new \InvalidArgumentException('Not a valid collation engine output array');
        }
        
        if (count($collationEngineOutput['witnesses']) !== count($this->witnesses)) {
            throw new \InvalidArgumentException('Invalid number of witnesses in collation engine data');
        }
        
        // Build sigla to collation engine output index conversion table
        $s2ci = [];
        foreach (array_keys($this->witnesses) as $siglum){
            $s2ci[$siglum] = -1;
        }
        foreach($collationEngineOutput['witnesses'] as $index => $siglum) {
            $s2ci[$siglum] = $index;
        }
        // Check consistency of witness data in Collatex output
        foreach (array_keys($this->witnesses) as $siglum){
            if ($s2ci[$siglum] === -1){
                throw new \InvalidArgumentException("Witness " . $siglum . ' not in given collation engine output');
            }
        }
        
        // All good so far, process the table
        // The collation engine output table is an array of segments. 
        // Each segment is an array with one element per witness, each one
        // containing a sequence of tokens 
        $table = $collationEngineOutput['table'];
        $witnessCount = count($this->witnesses);
        $newCollationTable = [];
        foreach (array_keys($this->witnesses) as $siglum) {
            $newCollationTable[$siglum] = [];
        }
        
        foreach ($table as $segment) {
            if (count($segment) !== $witnessCount) {
                throw new \InvalidArgumentException('Found invalid number of witnesses in a Collatex output segment');
            }
            $alignedSegment = $this->alignSegment($segment);
            foreach ($alignedSegment as $index => $witnessTokens) {
                $siglum = $collationEngineOutput['witnesses'][$index];
                foreach($witnessTokens as $segmentTokenIndex => $collationEngineToken) {
                    if (!isset($collationEngineToken['witnessRef'])) {
                        throw new \InvalidArgumentException('Cannot found witnessRef in given collation engine output');
                    }
                    $newCollationTable[$siglum][] = $collationEngineToken['witnessRef'];
                }
            }
        }
        
        $this->collationTable = $newCollationTable;
        
    }
    
    /**
     * Takes a Collatex output segment and aligns its token so that
     * all witness have exactly the same number of tokens
     * 
     * @param array $segment
     */
    
    protected function alignSegment(array $segment) : array {
        // 1. Analyze segment lengths
        $biggestLength = count($segment[0]);
        $allSameLength = true;
        for($i=1; $i < count($segment);$i++) {
            $currentLength = count($segment[$i]);
            if ($currentLength !== $biggestLength) {
                $allSameLength = false;
            }
            if ($currentLength > $biggestLength) {
                $biggestLength = $currentLength;
            }
        }
        
        if ($allSameLength) {
            // nothing to do
            return $segment;
        }
        
        $alignedSegment = [];
        // Basic implementation: pad smaller segments
        foreach($segment as $witnessSegment) {
            $paddedWitnessSegment = $witnessSegment;
            for ($j=count($witnessSegment); $j < $biggestLength; $j++) {
                $paddedWitnessSegment[] = [ 't' => self::COLLATIONENGINE_NULL_TOKEN, 'witnessRef' => -1];
            }
            $alignedSegment[] = $paddedWitnessSegment;
        }
        return $alignedSegment;
        
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
