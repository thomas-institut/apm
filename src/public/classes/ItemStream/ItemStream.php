<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\ItemStream;

use AverroesProject\ColumnElement\Element;
use AverroesProject\Data\DataManager;
/**
 * Utility class with algorithms for getting text out of item streams
 * 
 * TODO: move to a plugin
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
                        //case Element::HEAD:
                            foreach($element['items'] as $item) {
                                if ((int) $item['type'] === \AverroesProject\TxText\Item::NO_WORD_BREAK) {
                                    $foundNoWordBreak = true;
                                    continue;
                                }
                                $itemObject = DataManager::createItemObjectFromRow($item);
                                $itemPlainText = $itemObject->getPlainText();
                                if ($foundNoWordBreak) {
                                    $itemPlainText = preg_replace('/\A\s+/', '', $itemPlainText);
                                    $foundNoWordBreak = false;
                                }
                                $plainText .= $itemPlainText;
                            }
                            break;
                    }
                    // post Element
                    switch ($type) {
//                        case Element::HEAD:
//                            $plainText .= "\n";
//                            break;
                        
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
        return $plainText;
    }
    
    public static function createItemArrayFromItemStream($itemStream) 
    {
        $itemArray = [];
        $cE = 0;
        foreach($itemStream as $item) {
            if ( (int) $item['e.type'] !== Element::LINE) {
                continue;
            }
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
                $cE = $item['ce_id'];
                $tree[$cP]['cols'][$cC]['elements'][$cE]['id'] = $item['ce_id'];
                $tree[$cP]['cols'][$cC]['elements'][$cE]['type'] = $item['e.type'];
                $tree[$cP]['cols'][$cC]['elements'][$cE]['items'] = [];
            }
            $tree[$cP]['cols'][$cC]['elements'][$cE]['items'][] = $item;
        }
        return $tree;    
    }
}
