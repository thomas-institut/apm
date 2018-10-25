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

namespace APM\Core\Item;

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
    
    /** @var int */
    protected $textualFlow;
    const FLOW_MAIN_TEXT = 0;
    const FLOW_ADDITION = 1;
    const FLOW_GLOSS = 2;
    
    /** @var string */
    protected $location;
    const LOCATION_INLINE = '';
    
    /** @var string */
    protected $deletion;
    const DELETION_NONE='';
    
    
    /** @var array */
    protected $alternateTexts;
    
    
    
    public function __construct(string $t) {
        
        if ($t === '') {
            throw new \InvalidArgumentException('TextualItem text must not be empty');
        }
        $this->text=$t;
        $this->normalizedText='';
        $this->normalizationType= self::NORMALIZATION_NONE;
        $this->hand = self::DEFAULT_HAND;
        $this->format = self::FORMAT_NONE;
        $this->textualFlow = self::FLOW_MAIN_TEXT;
        $this->location = self::LOCATION_INLINE;
        $this->language = self::LANG_NONE;
        $this->deletion = self::DELETION_NONE;
        $this->alternateTexts = [];
    }
    
    public function getPlainText() {
        return $this->text;
    }

    public function getNormalizedText() {
        if ($this->normalizationType === self::NORMALIZATION_NONE) {
            return $this->getPlainText();
        }
        return $this->normalizedText;
    }

    public function setNormalization(string $normalizedText, string $normalizationType) {
        $this->normalizationType = $normalizationType;
        $this->normalizedText = $normalizedText;
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
}
