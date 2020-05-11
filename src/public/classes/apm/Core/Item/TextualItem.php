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

namespace APM\Core\Item;

use APM\ToolBox\StringFilter;
use InvalidArgumentException;

/**
 * A piece of text 
 * 
 * This class captures the different ways in which text can appear in a text
 * box in a transcription. It consists of a primary text with a series of attributes
 * that determine its appearance and role within the transcription:
 *   - hand
 *   - character format: e.g. rubric, initial, ...
 *   - normalization: normalized text and type of normalization (abbreviation, orthography, ...)
 *   - alternative readings:  readings and type of reading (sic, unclear, editorial)
 *   - textual flow: main text, addition, gloss
 *   - location: inline, above, below, margin
 *   - deletion: deletion status and technique
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TextualItem extends Item {
    
    /** @var string */
    protected $text;
    
    /** @var string */
    protected $normalizedText;
    
    /** @var string */
    protected $normalizationType;
    const NORMALIZATION_NONE = '';
    
    /** @var string */
    protected $language;
    const LANG_NONE = '';


    /** @var int */
    protected $hand;
    const DEFAULT_HAND = 0;
    
    /** @var string */
    protected $format;
    const FORMAT_NONE = '';
    
    /** @var string */
    protected $deletion;
    const DELETION_NONE='';
    
    /** @var float */
    protected $clarity;
    const CLARITY_CLEAR = 1.0;
    const CLARITY_UNCLEAR = 0.5;
    const CLARITY_ILLEGIBLE = 0;
    
    /** @var string */
    protected $clarityReason;
    const CLARITY_REASON_NONE = '';
    
    
    /** @var array */
    protected $alternateTexts;
    
    
    
    public function __construct(string $t) {
        
        if ($t === '') {
            throw new InvalidArgumentException('TextualItem text must not be empty');
        }
        parent::__construct();
        $this->setPlainText($t);
        $this->setNormalization('', self::NORMALIZATION_NONE);
        $this->setHand(self::DEFAULT_HAND);
        $this->setFormat(self::FORMAT_NONE);
        $this->setLanguage(self::LANG_NONE);
//        $this->setTextualFlow(self::FLOW_MAIN_TEXT);
//        $this->setLocation(self::LOCATION_INLINE);
        $this->setClarity(self::CLARITY_CLEAR, self::CLARITY_REASON_NONE);
        $this->setDeletion(self::DELETION_NONE);
        $this->setAlternateTexts([]);
    }
    
    public function getPlainText() {
        return $this->sanitizeText($this->text);
    }
    
    public function setPlainText(string $text) {
        $this->text = $text;
    }

    public function getNormalizedText() {
        if ($this->normalizationType === self::NORMALIZATION_NONE) {
            return $this->getPlainText();
        }
        return $this->sanitizeText($this->normalizedText);
    }

    public function getNormalizationType() {
        return $this->normalizationType;
    }
    public function setNormalization(string $normalizedText, string $normalizationType) {
        $this->normalizationType = $normalizationType;
        if ($normalizedText === '') {
            // If no normalized text is given, then just copy the main text
            // This is the case of a text marked as sic, but without a correction
            $this->normalizedText = $this->text;
        } else {
            $this->normalizedText = $normalizedText;
        }
        
    }
    
    public function setHand(int $hand) {
        $this->hand = $hand;
    }
    
    public function getHand() {
        return $this->hand;
    }
    
    public function setLanguage(string $lang) {
        $this->language = $lang;
    }
    
    public function getLanguage() {
        return $this->language;
    }
    
    public function setFormat(string $format) {
        $this->format = $format;
    }
    
    public function getFormat() {
        return $this->format;
    }
    
    public function setClarity(float $clarityIndex, string $reason = self::CLARITY_REASON_NONE) {
        $this->clarity = $clarityIndex;
        $this->clarityReason = $reason;
    }
    
    public function getClarityValue() {
        return $this->clarity;
    }
    
    public function getClarityReason() : string {
        return $this->clarityReason;
    }
    
    public function setSingleAlternateText(string $text) {
        $this->alternateTexts = [ $text ];
    }
    
    public function setAlternateTexts(array $texts) {
        $this->alternateTexts = $texts;
    }
    
    public function getAlternateTexts() : array {
        return $this->alternateTexts;
    }
    
    public function setDeletion(string $technique) {
        $this->deletion = $technique;
    }
    
    public function getDeletion() : string {
        return $this->deletion;
    }
    
    public function getLength() : int {
        return mb_strlen($this->getPlainText());
    }

    public function  getData(): array
    {
        $data =  parent::getData();

        $data['type'] = 'TextualItem';
        $data['normalizationType'] = $this->getNormalizationType();
        $data['format'] = $this->getFormat();
        $data['hand'] = $this->getHand();
        $data['language'] = $this->getLanguage();
        $data['clarity'] = $this->getClarityValue();
        $data['clarityReason'] = $this->getClarityReason();
        $data['deletion'] = $this->getDeletion();
        $data['alternateTexts'] = $this->getAlternateTexts();
        return $data;
    }

    private function sanitizeText(string $text) : string {
        return StringFilter::removeBOMs($text);
    }
}
