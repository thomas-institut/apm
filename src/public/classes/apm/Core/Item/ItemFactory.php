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

/**
 * Common Item types factory
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemFactory {
    
    private $defaultLanguage;
    private $defaultHand;
    
    const NORM_ABBREVIATION = 'abbr';
    const NORM_SIC = 'sic';
    
    const FORMAT_RUBRIC = 'rubric';
    const FORMAT_MATH = 'mathtext';
    const FORMAT_GLIPH = 'gliph';
    const FORMAT_INITIAL = 'initial';
    
    const ILLEGIBLE_CHARACTER = 'ø';
    
    public function __construct(string $lang, int $hand) {
        $this->defaultLanguage = $lang;
        $this->defaultHand = $hand;
    }
    
    public function createReferenceMark(string $refText) : Mark {
        return new Mark(MarkType::REF, $refText);
    }

    public function createParagraphMark() : Mark {
        return new Mark(MarkType::PARAGRAPH, '');
    }    
    
    public function createNoteMark() : Mark {
        return new Mark(MarkType::NOTE, '');
    }
    
    public function createNoWb() : NoWbMark {
        return new NoWbMark();
    }
    
    public function createCharacterGapItem(int $length = 1) : Mark {
        $item = new Mark(MarkType::GAP);
        $item->setLength($length);
        return $item;
    }
    
    public function createChunkMark(string $type, string $work, int $chunkNo, int $segment = 1) : ChunkMark {
        return new ChunkMark($type, $work, $chunkNo, $segment);
    }
    
    public function createPlainTextItem(string $text, string $lang = '') : TextualItem {
        $item = new TextualItem($text);
        $item->setHand($this->defaultHand);
        if ($lang === '') {
            $lang = $this->defaultLanguage;
        }
        $item->setLanguage($lang);
        return $item;
    }
    
    public function createAbbreviationItem(string $abbr, string $expansion, string $lang = '') : TextualItem {
        $item = $this->createPlainTextItem($abbr, $lang);
        $item->setNormalization($expansion, self::NORM_ABBREVIATION);
        return $item;
    }
    
    public function createSicItem(string $text, string $correction, string $lang='') : TextualItem {
        $item = $this->createPlainTextItem($text, $lang);
        $item->setNormalization($correction, self::NORM_SIC);
        return $item;
    }
    
    public function createUnclearItem(string $text, string $reason, string $altText = '', string $lang = '') : TextualItem {
        $item = $this->createPlainTextItem($text, $lang);
        $item->setClarity(TextualItem::CLARITY_UNCLEAR, $reason);
        if ($altText !== '') {
            $item->setSingleAlternateText($altText);
        }
        return $item;
    }
    
    public function createIllegibleItem(int $length, string $reason) : TextualItem {
        $item = $this->createPlainTextItem(str_repeat(self::ILLEGIBLE_CHARACTER, $length));
        $item->setClarity(TextualItem::CLARITY_ILLEGIBLE, $reason);
        return $item;
    }
    
    public function createRubricItem(string $text, string $lang='') : TextualItem {
        return $this->createSimpleFormatItem(self::FORMAT_RUBRIC, $text, $lang);
    }
    
    public function createMathTextItem(string $text, string $lang='') : TextualItem {
        return $this->createSimpleFormatItem(self::FORMAT_MATH, $text, $lang);
    }
    
    public function createGliphItem(string $text, string $lang='') : TextualItem {
        return $this->createSimpleFormatItem(self::FORMAT_GLIPH, $text, $lang);
    }
    
    public function createInitialItem(string $text, string $lang='') : TextualItem {
        return $this->createSimpleFormatItem(self::FORMAT_INITIAL, $text, $lang);
    }
    
    public function createAdditionItem(string $text, string $location, string $lang = '') : TextualItem {
        $item = $item = $this->createPlainTextItem($text, $lang);
        $item->setTextualFlow(TextualItem::FLOW_ADDITION);
        $item->setLocation($location);
        return $item;
    }
    
    public function createDeletionItem(string $text, string $technique, string $lang='') : TextualItem {
        $item = $item = $this->createPlainTextItem($text, $lang);
        $item->setDeletion($technique);
        return $item;
    }
    
    protected function createSimpleFormatItem(string $format, string $text, string $lang='') : TextualItem {
        $item = $this->createPlainTextItem($text, $lang);
        $item->setFormat($format);
        return $item;
    }
}
