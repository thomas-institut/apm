<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
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

namespace APM\Core\Collation;


use APM\Core\Token\Token;
use APM\Core\Apparatus\ApparatusGenerator;
use APM\Core\Witness\Witness;
use InvalidArgumentException;

/**
 * Representation of a collation table.
 * 
 * A collation table is a matrix of witness tokens. Each row is an array
 * of tokens coming out of a single witness possibly interspersed with empty
 * tokens. 
 * 
 * Each column represents a series of aligned tokens across the different
 * witnesses.
 * 
 * Not all tokens from a witness are in the collation table. In fact, by
 * default the collation table class ignores all whitespace tokens. It can
 * also be made to ignore punctuation.
 * 
 * The CollationTable class by itself does not guarantee any "proper" alignment 
 * of the witnesses' tokens but provides suitable data to feed a collation
 * engine to do the alignment work. It also provides a way to make itself
 * reflect the results of provided by such an engine.
 *
 * A collation table can also be used to define derivative witnesses. One
 * non-derivative witness can be designated as the base witness and other
 * rows are meant to represent differences to that base.
 *
 * The collation table class can also be used to define an edition witness:
 * one of the witnesses is taken to be the edition text with the collation
 * table itself representing how the source witnesses align with respect to
 * the text of the edition.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CollationTable {
    
    const TOKENREF_NULL = -1;
    const COLLATIONENGINE_NULL_TOKEN = '---';

    /**
     * @var array Array of Witness objects, one for each siglum
     */
    private $witnesses;

    /**
     * @var array Array a cache for witness tokens, see getWitnessTokens()
     */
    private $witnessTokensCache;
    
    /* @var array */
    private $collationTable;
    
    /* @var bool */
    private $ignorePunctuation;
    
    
    public function __construct($ignorePunctuation = false) {
        $this->witnesses = [];
        $this->witnessTokensCache = [];
        $this->collationTable = [];
        $this->ignorePunctuation = $ignorePunctuation;
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
     * Returns the number of tokens in the collation table
     * 
     * @return int
     */
    public function getTokenCount() {
        if (count($this->witnesses) === 0) {
            return 0;
        }
        $sigla = $this->getSigla();
        
        return count($this->collationTable[$sigla[0]]);
    }
    
    /**
     * Adds a witness to the collation with the given siglum
     * 
     * @param string $siglum
     * @param Witness $witness
     * @throws InvalidArgumentException
     */
    public function addWitness(string $siglum, Witness $witness) {
        
        $originalWitnessTokens = $witness->getTokens();
        $tokenTypesToIgnore = [ Token::TOKEN_WHITESPACE];
        if ($this->ignorePunctuation) {
            $tokenTypesToIgnore[] = Token::TOKEN_PUNCT;
        }
        $tokenRefs = $this->filterTokens($originalWitnessTokens, $tokenTypesToIgnore);
        
        $tokenCount = count($tokenRefs);
        if ($tokenCount === 0) {
            throw new InvalidArgumentException('Cannot add empty witnesses');
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
     * Returns a row of the collation table
     * @param string $siglum
     * @return array
     */
    public function getRow(string $siglum) : array {
        $rawCollationTokens = $this->getReferencesForRow($siglum);
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
    
    /**
     * Returns the full collation table
     * 
     * @return array
     */
    public function getCollationTable() : array {
        $table = [];
        foreach ($this->getSigla() as $siglum) {
            $table[$siglum] = $this->getRow($siglum);
        }
        return $table;
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
     * @throws InvalidArgumentException if the $index is out of range
     */
    public function getColumn(int $index) {
        $rawColumn = $this->getReferencesForColumn($index);
        $column = [];
        foreach(array_keys($rawColumn) as $siglum) {
            $ref = $rawColumn[$siglum];
            if ($ref === self::TOKENREF_NULL) {
                $column[$siglum] = Token::emptyToken();
                continue;
            }
            $column[$siglum] = $this->getWitnessTokens($siglum)[$ref];
        }
        return $column;
    }

    /**
     * Returns true if there is a witness with the given siglum
     * in the collation table
     *
     * @param string $siglum
     * @return bool
     */
    public function isSiglumInTable(string $siglum) {
        return isset($this->witnesses[$siglum]);
    }

    /**
     * Returns the witness with the given $siglum
     *
     * @param string $siglum
     * @return Witness
     */
    public function getWitness(string $siglum) : Witness {
        if ($this->isSiglumInTable($siglum)) {
            return $this->witnesses[$siglum];
        }
        throw new InvalidArgumentException('Unknown witness');
    }

    /**
     * Returns the tokens for the witness identified by the given siglum
     *
     * @param string $siglum
     * @return Token[]
     */
    public function getWitnessTokens(string $siglum) : array {

        if (!isset($this->witnessTokensCache[$siglum])) {
            $this->witnessTokensCache[$siglum] =$this->getWitness($siglum)->getTokens();
        }

        return $this->witnessTokensCache[$siglum];
    }
    
    /**
     * Returns an array of index references to the token array for a witness
     * Each element of this array corresponds to a column in the collation table.
     * An empty token in the collation table is represented by the 
     * constant CollationTable::TOKENREF_NULL
     *
     * @param string $siglum
     * @return array
     */
    public function getReferencesForRow(string $siglum) : array {
        return $this->collationTable[$siglum];
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
            $column = $this->getReferencesForColumn($i);
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
            $witnessTokens = $this->getWitnessTokens($siglum);
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
    
    /**
     * Sets up the collation table using the output of a collation engine
     * 
     * @param array $collationEngineOutput
     * @throws InvalidArgumentException
     */
    public function setCollationTableFromCollationEngineOutput(array $collationEngineOutput) {
        // First, check that the input is a valid collation engine output
        if (!isset($collationEngineOutput['table']) || !isset($collationEngineOutput['witnesses'])) {
            throw new InvalidArgumentException('Not a valid collation engine output array');
        }
        
        if (count($collationEngineOutput['witnesses']) !== count($this->witnesses)) {
            throw new InvalidArgumentException('Invalid number of witnesses in collation engine data');
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
                throw new InvalidArgumentException("Witness " . $siglum . ' not in given collation engine output');
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
                throw new InvalidArgumentException('Found invalid number of witnesses in a Collatex output segment');
            }
            $alignedSegment = $this->alignSegment($segment);
            foreach ($alignedSegment as $index => $witnessTokens) {
                $siglum = $collationEngineOutput['witnesses'][$index];
                foreach($witnessTokens as $segmentTokenIndex => $collationEngineToken) {
                    if (!isset($collationEngineToken['witnessRef'])) {
                        throw new InvalidArgumentException('Cannot found witnessRef in given collation engine output');
                    }
                    $newCollationTable[$siglum][] = $collationEngineToken['witnessRef'];
                }
            }
        }
        
        $this->collationTable = $newCollationTable;
        
    }
    
    /**
     * Returns a matrix with the ranking of each reading for each token
     * in the collation table in relation to the other readings in the same
     * column.
     * 
     * The returned array is of the form:
     *   $variantTable = [ 'siglum1' => [ rankToken1, rankToken2, ..., rankTokenN ],
     *                    'siglum2' => [ rankToken1, ...  ]
     *                     ...
     *                     ];
     * 
     * Where rankTokenJ is an integer representing the rank of the corresponding
     * token's reading within its column. So, if the token's reading is the 
     * most common reading, its rank is 0, if it's the second most common, its
     * rank is 1, and so on. Empty tokens get rank -1
     * 
     * @return array
     */
    public function getVariantTable() : array {
        $tokenCount = $this->getTokenCount();
        $variantTable = [];
        $sigla = $this->getSigla();
        foreach($sigla as $siglum) {
            $variantTable[$siglum] = [];
        }
        
        for ($i = 0; $i< $tokenCount; $i++) {
            $column = $this->getColumn($i);
            $readings = [];
            foreach($column as $siglum => $token) {
                if ($token->isEmpty()) {
                    continue;
                }
                if (!isset($readings[$token->getNormalization()])) {
                    $readings[$token->getNormalization()] = 0;
                }
                $readings[$token->getNormalization()]++;
            }
            arsort($readings);
            $rankings = array_keys($readings);
            
            foreach($column as $siglum => $token) {
                if ($token->isEmpty()) {
                    $variantTable[$siglum][] = -1;
                    continue;
                }
                $searchResult = array_search($token->getNormalization(), $rankings);
                $rank = $searchResult === false ? -1 : intVal($searchResult);
                $variantTable[$siglum][] = $rank;
            }
        }
        return $variantTable;
    }

    /**
     * Takes a Collatex output segment and aligns its tokens so that
     * all witness have exactly the same number of tokens
     *
     * @param array $segment
     * @return array
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
    
    protected function getReferencesForColumn(int $index) : array {
        if ($index >= $this->getTokenCount()) {
            throw new InvalidArgumentException('Index out of range');
        }
        $rawColumn = [];
        foreach(array_keys($this->collationTable) as $siglum) {
            $rawColumn[$siglum] = $this->collationTable[$siglum][$index];
        }
        return $rawColumn;
    }
    
    private function removeColumn(int $index) {
        foreach($this->collationTable as &$collationTableRow) {
            array_splice($collationTableRow, $index, 1);
        }
    }
    
    private function filterTokens(array $tokens, array $tokenTypesToIgnore) {
        $tokenRefs = [];
        foreach($tokens as $index => $token) {
            if (array_search($token->getType(), $tokenTypesToIgnore) !== false) {
                continue;
            }
            $tokenRefs[] = $index;
        }
        return $tokenRefs;
    }
    
}
