<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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
 * Common Item types factory
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemFactory {
    
    private $defaultLanguage;
    private $defaultHand;
    
    public function __construct(string $lang, int $hand) {
        $this->defaultLanguage = $lang;
        $this->defaultHand = $hand;
    }
    
    public function createReferenceMark(string $refText) : Mark {
        return new Mark('ref', $refText);
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
        $item->setNormalization($expansion, 'abbr');
        return $item;
    }
    
    public function createRubricItem(string $text, string $lang='') : TextualItem {
        $item = $this->createPlainTextItem($text, $lang);
        $item->setFormat('rubric');
        return $item;
    }
}
