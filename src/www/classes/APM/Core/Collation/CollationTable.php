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



use APM\Core\Token\NormalizationSource;
use APM\Core\Token\Normalizer\CompositeNormalizer;
use APM\Core\Token\Normalizer\WitnessTokenNormalizer;
use APM\Core\Token\Token;
use APM\Core\Apparatus\ApparatusGenerator;
use APM\Core\Token\TokenType;
use APM\Core\Witness\TokenNormalizationsDecorator;
use APM\Core\Witness\Witness;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;

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
 * Not all tokens from a witness are present in the collation table. Normally,
 * only word tokens are taken into account.
 * 
 * The CollationTable class by itself does not guarantee any proper alignment
 * of the witnesses' tokens, whatever "proper alignment" may mean. The class
 * provides, however, a method to generate suitable data to feed a collation
 * engine to do the alignment work. It also provides a way to make itself
 * reflect the results provided by such an engine.
 *
 * A collation table can be used to define derivative witnesses. One
 * non-derivative witness can be designated as the base witness and other
 * rows are meant to represent differences to that base.
 *
 * The collation table class can also be used to define a composite witness,
 * which is basically a critical edition:
 * one of the witnesses is taken to be the edition text with the collation
 * table itself representing how the source witnesses align with respect to
 * the text of the edition. As is the case with transcription witnesses, a critical
 * edition witness may have tokens that do not appear in the collation table, for example
 * titles, paragraph breaks, punctuation, etc.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CollationTable implements LoggerAwareInterface, CodeDebugInterface {


    use LoggerAwareTrait, CodeDebugWithLoggerTrait;

    const TOKENREF_NULL = -1;
    const COLLATIONENGINE_NULL_TOKEN = '---';

    const DEFAULT_LANGUAGE = 'la';

    /**
     * @var array Array of Witness objects, one for each siglum
     */
    private array $witnesses;

    /**
     * @var array Array a cache for witness tokens, see getWitnessTokens()
     */
    private array $witnessTokensCache;
    
    /* @var array */
    private array $referenceMatrix;
    
    /* @var bool */
    private bool $ignorePunctuation;
    /**
     * @var string
     */
    private string $language;

    /**
     * @var WitnessTokenNormalizer[]
     */
    private array $normalizers;

    /**
     * @var string[]
     */
    private array $witnessTitles;
    private string $editionWitnessSiglum;
    private string $title;


    public function __construct(bool $ignorePunctuation = false, string $lang = self::DEFAULT_LANGUAGE, array $normalizers = []) {
        $this->witnesses = [];
        $this->witnessTokensCache = [];
        $this->witnessTitles = [];
        $this->referenceMatrix = [];
        $this->ignorePunctuation = $ignorePunctuation;
        $this->normalizers = $normalizers;
        $this->editionWitnessSiglum = '';
        $this->setLanguage($lang);
        $this->setLogger(new NullLogger());
        $this->title = 'Collation Table';
    }

    public function setTitle($title) {
        $this->title = $title;
    }

    public function getTitle() : string {
        return $this->title;
    }

    public function getLanguage(): string {
        return $this->language;
    }

    public function setLanguage(string $lang) : void {
        if ($lang === ''){
            throw new InvalidArgumentException("Language cannot be blank");
        }
        $this->language = $lang;
    }
    
    /**
     * Returns the sigla in the collation table
     * 
     * @return string[]
     */
    public function getSigla(): array
    {
        return array_keys($this->witnesses);
    }

    public function getWitnessTitle($siglum) : string {
        return $this->witnessTitles[$siglum];
    }

    public function isEdition() : bool {
        return $this->editionWitnessSiglum !== '';
    }

    public function getEditionWitnessSiglum() : string {
        return $this->editionWitnessSiglum;
    }
    
    /**
     * Returns the number of tokens in the collation table
     * 
     * @return int
     */
    public function getTokenCount(): int
    {
        if (count($this->witnesses) === 0) {
            return 0;
        }
        $sigla = $this->getSigla();
        
        return count($this->referenceMatrix[$sigla[0]]);
    }

    private function getTokensForLog($witness) : array {
        $decorator = new TokenNormalizationsDecorator();

        return $decorator->getDecoratedTokens($witness);
    }

    /**
     * Adds a witness to the collation with the given siglum
     * 
     * @param string $siglum
     * @param Witness $witness
     * @throws InvalidArgumentException
     */
    public function addWitness(string $siglum, Witness $witness, string $title = '', bool $isEdition = false) {


        //$this->codeDebug("Adding witness $siglum", [ 'tokens' =>  $this->getTokensForLog($witness)]);

        $this->applyNormalizations($witness);

        //$this->codeDebug("After normalizations", [ 'tokens' => $this->getTokensForLog($witness)]);

        $originalWitnessTokens = $witness->getTokens();

        $tokenTypesToIgnore = [ TokenType::WHITESPACE];
        if ($this->ignorePunctuation) {
            $tokenTypesToIgnore[] = TokenType::PUNCTUATION;
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
        $this->referenceMatrix[$siglum] = $tokenRefs;
        $this->witnesses[$siglum] = $witness;
        $this->witnessTitles[$siglum] = $title === '' ? $siglum : $title;
        if ($isEdition) {
            $this->editionWitnessSiglum = $siglum;
        }

    }

    /**
     * Set the reference array for the given row in the collation table
     *
     * (!)  Use with care.
     *
     * @param $siglum
     * @param $referenceArray
     */
    public function setReferencesForRow($siglum, $referenceArray) {
        // check token counts
        if (count($referenceArray) !== $this->getTokenCount()) {
            throw new InvalidArgumentException("Expected " . $this->getTokenCount() . " references in array, got" . count($referenceArray));
        }

        //make sure that each reference in the given reference array points to an existing token in the witness
        $maxValidReference = count($this->getWitness($siglum)->getTokens()) - 1;
        foreach($referenceArray as $ref) {
            if ($ref !== -1 && $ref > $maxValidReference) {
                throw new InvalidArgumentException("Invalid reference $ref in reference array");
            }
        }
        $this->referenceMatrix[$siglum] = $referenceArray;

    }

    /**
     * Returns a row of the collation table
     * @param string $siglum
     * @return array
     */
    public function getRow(string $siglum) : array {
        $rowTokenReferences = $this->getReferencesForRow($siglum);
        $witnessTokens = $this->getWitnessTokens($siglum);
        
        $collationTokens = [];
        foreach ($rowTokenReferences as $collationTokenRef) {
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
    public function getColumn(int $index): array
    {
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
    public function isSiglumInTable(string $siglum): bool
    {
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
    public function getWitnessTokens(string $siglum) : array
    {

        if (!isset($this->witnessTokensCache[$siglum])) {
            $this->witnessTokensCache[$siglum] = $this->getWitness($siglum)->getTokens();
        }

        return $this->witnessTokensCache[$siglum];
    }



    private function applyNormalizations(Witness $witness) : void {
       $compositeNormalizer = new CompositeNormalizer($this->normalizers);
       $witness->applyTokenNormalization($compositeNormalizer, false, NormalizationSource::AUTOMATIC_COLLATION);
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
        return $this->referenceMatrix[$siglum];
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
        $originalSize = count($this->referenceMatrix[$siglum]);
        $firstPart = array_slice($this->referenceMatrix[$siglum], 0, $index);
        $secondPart = array_slice($this->referenceMatrix[$siglum], $index);
        for($i=0; $i<$count; $i++) {
            $firstPart[] = self::TOKENREF_NULL;
        }
        $this->referenceMatrix[$siglum] = array_merge($firstPart, $secondPart);
        
        $newSize = count($this->referenceMatrix[$siglum]);
        // Deal with the extra tokens at the end
        for ($i = 0; $i < $count; $i++) {
            if ($this->referenceMatrix[$siglum][$newSize-1] === self::TOKENREF_NULL) {
                // Last token is null, just pop it and return
                array_pop($this->referenceMatrix[$siglum]);
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
    
    public function getApparatusEntryForColumn(int $columnIndex, string $mainReading, string $lemma = ''): string
    {
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
            foreach($this->referenceMatrix[$siglum] as $columnNumber => $ref) {
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
        // Check consistency of witness data in collation engine output
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
        $newReferenceMatrix = [];
        foreach (array_keys($this->witnesses) as $siglum) {
            $newReferenceMatrix[$siglum] = [];
        }
        
        foreach ($table as $segment) {
            if (count($segment) !== $witnessCount) {
                throw new InvalidArgumentException('Found invalid number of witnesses in a collation engine output segment');
            }
            $alignedSegment = $this->alignSegment($segment);
            foreach ($alignedSegment as $index => $witnessTokens) {
                $siglum = $collationEngineOutput['witnesses'][$index];
                foreach($witnessTokens as $segmentTokenIndex => $collationEngineToken) {
                    if (!isset($collationEngineToken['witnessRef'])) {
                        throw new InvalidArgumentException('Cannot found witnessRef in given collation engine output');
                    }
                    $newReferenceMatrix[$siglum][] = $collationEngineToken['witnessRef'];
                }
            }
        }
        
        $this->referenceMatrix = $newReferenceMatrix;
        
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

    public function getData() : array {
        $data = [];
        $data['lang'] = $this->getLanguage();
        $sigla = $this->getSigla();
        $data['sigla'] = $sigla;
        $witnessDataArrays = [];
        $matrix = [];
        foreach($sigla as $i => $siglum) {
            $witnessDataArrays[$i] = $this->getWitness($siglum)->getData();
            $matrix[$i] = $this->getReferencesForRow($siglum);
        }
        $data['witnesses'] = $witnessDataArrays;
        $data['collationMatrix'] = $matrix;
        //$data['automaticNormalizationsApplied'] = $this->normalizers;
        return $data;
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
        foreach($this->referenceMatrix as &$collationTableRow) {
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
        foreach(array_keys($this->referenceMatrix) as $siglum) {
            $rawColumn[$siglum] = $this->referenceMatrix[$siglum][$index];
        }
        return $rawColumn;
    }
    
    private function removeColumn(int $index) {
        foreach($this->referenceMatrix as &$collationTableRow) {
            array_splice($collationTableRow, $index, 1);
        }
    }
    
    private function filterTokens(array $tokens, array $tokenTypesToIgnore): array
    {
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
