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

namespace AverroesProjectToApm;

use APM\Core\Transcription\PageTranscriptionBasic;
use APM\Core\Item\ItemFactory;
use AverroesProject\ColumnElement\Element;

/**
 * Converter from AverroesProject page transcriptions
 * to APM page transcriptions that generates PageTranscriptionBasic 
 * objects
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de> 
 */
class PageTranscriptionConverterBasic extends PageTranscriptionConverter {
    
    public function convert(array $elements, array $ednotes = []) {
        
        $columnItems = [];
        
        
        foreach($elements as $element) {
            /* @var $element Element */
            if (!array_key_exists($element->columnNumber, $columnItems)) {
                $columnItems[$element->columnNumber] = [];
            }
            $if = new ItemFactory($element->lang, $element->handId);
            
            foreach ($element->items as $item) {
                /* @var $item AverroesProject\TxText\Item */
                switch ($item->type) {
                    case \AverroesProject\TxText\Item::TEXT:
                        $columnItems[$element->columnNumber][] = $if->createPlainTextItem($item->theText);
                        break;
                }
            }
            
            // Add a line break at the end of every element
            $columnItems[$element->columnNumber][] = $if->createPlainTextItem("\n");
        }
        
        $pt = new PageTranscriptionBasic();
        $tbf = new \APM\Core\Transcription\TextBoxFactory();
        foreach($columnItems as $columnId => $items) {
            $pt->addTextBox($tbf->createColumn($columnId, $items));
        }
        
        
        return $pt;
    }
    
}
