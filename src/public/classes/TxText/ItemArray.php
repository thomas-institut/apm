<?php
/*
 * Copyright (C) 2017 Universität zu Köln
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

/**
 * 
 * Methods to manage an array of Items meant to be part of an element
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 *
 */

namespace AverroesProject\TxText;

use AverroesProject\Algorithm\MyersDiff;
use AverroesProject\Algorithm\Utility;

class ItemArray
{

    /**
     * Adds an item to an array making sure the sequence numbers
     * in the individual items are consistent with the array indexes
     *
     * @param Item[] $itemArray
     * @param Item $item
     * @param boolean $atTheEnd  (if true, the item will be assigned a sequence 
     *              number 
     * @throws InvalidArgumentException
     */
    public static function addItem(&$itemArray, $item, $atTheEnd=false)
    {
        if (!($item instanceof Item)) {
             throw new \InvalidArgumentException(
                     "Objects added to an ItemArray should be of class Item");
        }
        $index = count($itemArray);
        $maxSeq = -1;
        if ($index > 0) {
            $maxSeq = $itemArray[$index-1]->seq;
        }
        $itemArray[$index] = $item;
        if ($item->seq == -1 || $atTheEnd) {
            $itemArray[$index]->seq = $maxSeq+1;
        }
        Utility::arraySortByKey($itemArray, 'seq');
    }

    /**
     * Returns the textual representation of a whole Item array
     * @param type $itemArray
     * @return string
     */
    public static function getText($itemArray)
    {
        $text = '';
        foreach ($itemArray as $item) {
            $text = $text . $item->getText();
        }
        return $text;
    }
    
    /**
     * Sets the language of the items in an array if not set or
     * if $force is true
     *
     * @param Item[] $itemArray 
     * @param string $lang 
     * @param boolean $force
     */
    public static function setLang($itemArray, $lang, $force = false)
    {
        foreach ($itemArray as $item) {
            if ($force || $item->getLang() === Item::LANG_NOT_SET) {
                $item->setLang($lang);
            } 
        }
    }
    
    /**
     * Sets the hand ID of the items in an array if not set or
     * if $force is true
     *
     * @param Item[] $itemArray 
     * @param int $handId 
     * @param boolean $force
     */
    public static function setHandId($theItems, $handId, $force = false)
    {
        foreach ($theItems as $item) {
            if ($force || $item->getHandId() ===  Item::ID_NOT_SET) {
                $item->setHandId($handId);
            }
        }
    }
    
    public static function isRtl($theItems)
    {
        $n = count($theItems);
        $rtl = 0;
        foreach ($theItems as $item) {
            if ($item->isRtl()) {
                $rtl++;
            }
        }
        return $rtl > ($n - $rtl);
    }
    
    /**
     * Gets the edit script that transform the array into the
     * given array. The resulting indexes in the edit script 
     * refer to sequence numbers (1,2,...), not array indexes (0,1,...)
     *
     * Assumes the items in both arrays are ordered according to 
     * the desired sequences. 
     * 
     * @param Item[] $oldArray
     * @param Item[] $newArray
     */
    public static function getEditScript($oldArray, $newArray) 
    {
        $editScript = MyersDiff::calculate(
            $oldArray,
            $newArray, 
            function ($a, $b) { return Item::isItemDataEqual($a, $b);}
        );

        return $editScript;
    }
    
}
