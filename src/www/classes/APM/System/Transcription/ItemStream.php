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

namespace APM\System\Transcription;

use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TxText\Item;
use APM\System\Transcription\TxText\Text;

/**
 * Utility class with algorithms for getting text out of item streams
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemStream {
    
    public static function getPlainText($itemStream): string
    {
        $itemTree = self::createPageColElementItemTreeFromItemStream($itemStream);
        $plainText = '';
        $foundNoWordBreak = false;
        foreach ($itemTree as $page) {
            foreach($page['cols'] as $col) {
                foreach($col['elements'] as $element) {
                    $type = (int) $element['type'];
                    
                    // element
                    switch ($type) {
                        case Element::LINE:
                        case Element::SUBSTITUTION:
                            foreach($element['items'] as $item) {
                                if ((int) $item['type'] === Item::NO_WORD_BREAK) {
                                    $foundNoWordBreak = true;
                                    continue;
                                }
                                $itemObject = ApmTranscriptionManager::createItemObjectFromRow($item);
                                $itemPlainText = $itemObject->getPlainText();
                                if ($foundNoWordBreak) {
                                    $itemPlainText = mb_ereg_replace('\A\s+', '', $itemPlainText);
                                    $foundNoWordBreak = false;
                                }
                                $plainText .= $itemPlainText;
                            }
                            break;
                    }
                    // post Element
                    switch ($type) {
                       
                        case Element::LINE:
                            if ($foundNoWordBreak) {
                                $foundNoWordBreak = false;
                                break;
                            }
                            $plainText .= ' ';
                            break;
                    }
                }
            }
        }
        
        return trim($plainText);
    }
    
    public static function createItemArrayFromItemStream($itemStream): array
    {
        $itemArray = [];
        $cE = 0;
        foreach($itemStream as $item) {
            if ($item['ce_id'] !== $cE) {
                // add a new line after each element
                $cE = $item['ce_id'];
                $itemArray[] = new Text(0, 0, "\n");
            }
            $itemArray[] = ApmTranscriptionManager::createItemObjectFromRow($item);
        }
        return $itemArray;
    }
    
    public static function createPageColElementItemTreeFromItemStream($itemStream): array
    {
        $tree = [];
        
        $cP = 0;
        $cC = 0;
        $cE = 0;
        $columnElementIndex = 0;
        foreach($itemStream as $item){
            if ($item['page_id'] !== $cP)  {
                // New Page
                $cP = $item['page_id'];
                $tree[$cP]['id']=$item['page_id'];
                $tree[$cP]['seq']=$item['p.seq'];
                $tree[$cP]['foliation']= 
                        is_null($item['foliation']) ? 
                            $item['p.seq'] : $item['foliation'];
                $tree[$cP]['cols']=[];
                $cC = 0;
            }
            if ($item['col'] !== $cC)  {
                // New column
                $cC = $item['col'];
                $tree[$cP]['cols'][$cC]['elements'] = [];
                $cE = 0;
            }
            if ($item['ce_id'] !== $cE) {
                // we need to detect changes in element id but cannot
                // rely on that number to store the items in the tree.
                // Indeed, single line elements may not be contiguous in
                // the stream due to marginal additions
                $cE = $item['ce_id'];
                $columnElementIndex++;
                $tree[$cP]['cols'][$cC]['elements'][$columnElementIndex]['id'] = $item['ce_id'];
                $tree[$cP]['cols'][$cC]['elements'][$columnElementIndex]['type'] = $item['e.type'];
                $tree[$cP]['cols'][$cC]['elements'][$columnElementIndex]['items'] = [];
            }
            $tree[$cP]['cols'][$cC]['elements'][$columnElementIndex]['items'][] = $item;
        }
        return $tree;    
    }
}
