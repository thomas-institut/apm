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

namespace AverroesProjectToApm;


use APM\Core\Item\Item;

use APM\Core\Item\ItemFactory;
use AverroesProject\TxText\Item as AP_Item;
/**
 * Factory of Items out of AP item stream rows
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemStreamItemFactory {
    
    /**
     *
     * @var ItemFactory
     */
    private $if;
    
    public function __construct(string $defaultLang) {
        $this->if = new ItemFactory($defaultLang, 0);
    }
    
    public function createItemFromRow($row) : Item {
        $lang = $row['lang'];
        $text = $row['text'];
        $altText = $row['alt_text'];
        $extraInfo = $row['extra_info'];
        
        switch($row['type']) {
            case AP_Item::TEXT:
                return $this->if->createPlainTextItem($text, $lang);
            
            case AP_Item::RUBRIC: 
                return $this->if->createRubricItem($text, $lang);
                
            case AP_Item::SIC:
                return $this->if->createSicItem($text, $altText, $lang);
            
            case AP_Item::UNCLEAR:
                return $this->if->createUnclearItem($text, $extraInfo, $altText, $lang);
                
            case AP_Item::ABBREVIATION:
                return $this->if->createAbbreviationItem($text, $altText, $lang);
        }
        
    }
}
