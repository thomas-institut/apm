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

namespace APM\Core\Token;

use APM\Core\Address\PointRange;

/**
 * A token in a transcription witness
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TranscriptionToken extends Token {
    
    /**
     *
     * @var array Array of indexes to the transcription's item array
     */
    protected array $sourceItemIndexes;
    
    /**
     *
     * @var array Array of ItemInDocumentAddress objects
     */
    protected array $sourceItemAddresses;
    
    /**
     *
     * @var array Array of IntRange objects
     */
    protected array $sourceItemCharRanges;
    
    /**
     * line:char range with respect to the token's text box
     * @var PointRange
     */
    protected PointRange $textBoxLineRange;
    
    
    public function getTextBoxLineRange() : PointRange {
        return $this->textBoxLineRange;
    }
    
    public function setTextBoxLineRange(PointRange $range) {
        $this->textBoxLineRange = $range;
    }
    
    public function __construct(int $type, string $text, string $normalization = '') {
        parent::__construct($type, $text, $normalization);
        $this->setSourceItemIndexes([]);
        $this->setSourceItemAddresses([]);
        $this->setSourceItemCharRanges([]);
        $this->textBoxLineRange = new PointRange([-1,-1], [-1, -1]);
    }
    
    public function getSourceItemAddresses() : array {
        return $this->sourceItemAddresses;
    }
    
    public function setSourceItemAddresses(array $addresses) {
        $this->sourceItemAddresses = $addresses;
    }
    
    public function getSourceItemIndexes() : array {
        return $this->sourceItemIndexes;
    }
    public function setSourceItemIndexes(array $indexes) {
        $this->sourceItemIndexes = $indexes;
    }
    
    public function getSourceItemCharRanges() : array {
        return $this->sourceItemCharRanges;
    } 
    
    public function setSourceItemCharRanges(array $ranges) {
        $this->sourceItemCharRanges = $ranges;
    }
    
    public static function addTokens(TranscriptionToken $t1, TranscriptionToken $t2) : TranscriptionToken {
        
        $rt = new TranscriptionToken(
                $t1->getType(), 
                $t1->getText() . $t2->getText(),
                $t1->getNormalization() . $t2->getNormalization()
            );
        $rt->setSourceItemIndexes(array_merge(
                $t1->getSourceItemIndexes(), 
                $t2->getSourceItemIndexes()
            ));
        $rt->setSourceItemAddresses(array_merge(
                $t1->getSourceItemAddresses(), 
                $t2->getSourceItemAddresses()
            ));
        $rt->setSourceItemCharRanges(array_merge(
                $t1->getSourceItemCharRanges(), 
                $t2->getSourceItemCharRanges()));
        $lineRange = new PointRange($t1->getTextBoxLineRange()->getStart(), 
                $t2->getTextBoxLineRange()->getEnd());
        $rt->setTextBoxLineRange($lineRange);
        return $rt;
    }

    public function getData(): array
    {
         $data = parent::getData();

         $itemIndexes =  $this->getSourceItemIndexes();
         $charRanges = $this->getSourceItemCharRanges();


         for($i = 0; $i < count($itemIndexes); $i++) {
             $itemDataInToken = [];
             $itemDataInToken['itemIndex'] = $itemIndexes[$i];
             $itemCharRange = $charRanges[$i];
             $itemDataInToken['charRange'] = [
                 'from' => $itemCharRange->getStart(),
                 'to' => $itemCharRange->getEnd(),
                 'length' => $itemCharRange->getLength()
             ];
             $data['itemData'][] = $itemDataInToken;
         }

         $startLine = $this->getTextBoxLineRange()->getStart();
         $endLine = $this->getTextBoxLineRange()->getEnd();
         $data['lineRange'] = [
             'start' => [
                 'textBox' => $startLine->getCoord(0),
                 'lineNumber' => $startLine->getCoord(1)
             ],
             'end' => [
                 'textBox' => $endLine->getCoord(0),
                 'lineNumber' => $endLine->getCoord(1)
             ]
         ];

         return $data;
    }

}
