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

namespace AverroesProject\ItemStream;

use AverroesProject\ColumnElement\Element;
use AverroesProject\Data\DataManager;

/**
 * Utility class with algorithms for getting text out of item streams
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ItemStream {
    
    public static function getPlainText($itemStream)
    {
        $itemTree = self::createPageColElementItemTreeFromItemStream($itemStream);
        $plainText = '';
        $foundNoWordBreak = false;
        foreach ($itemTree as $page) {
            //$plainText .= '[' . $page['foliation'] . '] ';
            foreach($page['cols'] as $col) {
                foreach($col['elements'] as $element) {
                    $type = (int) $element['type'];
                    
                    // element
                    switch ($type) {
                        case Element::LINE:
                        case Element::SUBSTITUTION:
                            foreach($element['items'] as $item) {
                                if ((int) $item['type'] === \AverroesProject\TxText\Item::NO_WORD_BREAK) {
                                    $foundNoWordBreak = true;
                                    continue;
                                }
                                $itemObject = DataManager::createItemObjectFromRow($item);
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
    
    public static function createItemArrayFromItemStream($itemStream) 
    {
        $itemArray = [];
        $cE = 0;
        foreach($itemStream as $item) {
//            if ( (int) $item['e.type'] !== Element::LINE) {
//                continue;
//            }
            if ($item['ce_id'] !== $cE) {
                // add a new line after each element
                $cE = $item['ce_id'];
                $itemArray[] = new \AverroesProject\TxText\Text(0, 0, "\n");
            }
            $itemArray[] = DataManager::createItemObjectFromRow($item);     
        }
        return $itemArray;
    }
    
    public static function createPageColElementItemTreeFromItemStream($itemStream)
    {
        $tree = [];
        
        $cP = 0;
        $cC = 0;
        $cE = 0;
        $cEindex = 0;
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
                // Indeed, single line elements may be discontiguous in
                // the stream due to marginal additions
                $cE = $item['ce_id'];
                $cEindex++;
                $tree[$cP]['cols'][$cC]['elements'][$cEindex]['id'] = $item['ce_id'];
                $tree[$cP]['cols'][$cC]['elements'][$cEindex]['type'] = $item['e.type'];
                $tree[$cP]['cols'][$cC]['elements'][$cEindex]['items'] = [];
            }
            $tree[$cP]['cols'][$cC]['elements'][$cEindex]['items'][] = $item;
        }
        return $tree;    
    }
}
