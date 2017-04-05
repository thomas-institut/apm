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
 * @brief TranscriptionText classes
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 * 
 * 
 * A piece of transcribed text is an array of TxText\Item. 
 * Each Item has a unique Id that identifies it in the system, 
 * and a reference to its parent ColumnElement\Element.
 * 
 * Normally each Item inherits language and hand from its
 * parent, but some may have a different one. EditorialNotes can refer to 
 * TranscribedTextItem's ids. 
 * 
 * Each Item then has the following data:
 *    id: unique Integer
 *    language:  ar | he | la | de | en | fr
 *    hand : Hand = SQL: hands.id
 *    sequence: Integer 
 * 
 *    + text:  i.e., normal text 
 *        theText : String
 *    + rubric:
 *        theText : String
 *    + initials:
 *        theText : String
 *    + sic: 
 *         theText: String
 *         correction: String  (may be NULL)
 * 
 *    + unclear text: 
 *         proposed reading: String  
 *         alternative reading: String
 *         reason: unclear | damaged
 *         // any other alternative readings can be left to the notes
 * 
 *    + illegible text:  (=gap in TEI)
 *         length: Integer : # of illegible characters
 *         reason:  illegible | damaged
 * 
 *    // TEI has a "damaged" element, which is just a list of unclear
 *    // and illegible portions. Any sequence of unclear and illegible
 *    // items with reason = damaged amounts to one of such elements
 * 
 *    + gliph:
 *       theText: String  (usually 1 character)
 * 
 *    + nolinebreak: strictly as the last element in a line
 *       no data, just a mark
 * 
 *    + mark: a place holder associated with an off-flow addition
 *       no data, just a mark
 *    
 *    + deletion:
 *        theText: String
 *        technique: strikeover | two-dots | ....
 * 
 *    + in-flow addition: 
 *        theText : String
 *        place (in-flow) : above | below | inline | overflow | inspace
 *        target: deletion id (optional)
 *               // the presence a deletion id signals that this is 
 *               // a replacement, no need to designate it as such
 * 
 *
 */

namespace AverroesProject\TxText;

use AverroesProject\Algorithm\MyersDiff;
use AverroesProject\Algorithm\Utility;

class ItemArray
{
    
    /**
     *
     * @var Item[]
     */
    public $theItems;
    
    public $lang;
    public $editorId;
    public $handId;
    
    /**
     *
     * @var int
     */
    public $parentColumnElementId;
    
    
    public function __construct($parent = 0, $lang = 'la', $editor = 0, $hand = 0)
    {
        
        $this->theItems = [];
        $this->lang = $lang;
        $this->editorId = (int) $editor;
        $this->handId = (int) $hand;
        $this->parentColumnElementId = (int) $parent;
    }
    
    /**
     * 
     * @param Item $item
     * @param bool $atTheEnd  (if true, the item will be assigned a sequence 
     *              number 
     * @throws InvalidArgumentException
     */
    public function addItem($item, $atTheEnd=false)
    {
        if (!($item instanceof Item)) {
             throw new \InvalidArgumentException(
                     "Objects added to an ItemArray should be of class Item");
        }
        $index = count($this->theItems);
        $maxSeq = -1;
        if ($index > 0) {
            $maxSeq = $this->theItems[$index-1]->seq;
        }
        $this->theItems[$index] = $item;
        if ($item->seq == -1 || $atTheEnd) {
            $this->theItems[$index]->seq = $maxSeq+1;
        }
        Utility::arraySortByKey($this->theItems, 'seq');
        
    }
    
    public function getItem($seq)
    {
        
        return $this->theItems[$seq];
    }
    
    public function nItems()
    {
        return count($this->theItems);
    }
    
    public function getText()
    {
        $text = '';
        foreach ($this->theItems as $item) {
            $text = $text . $item->getText();
        }
        return $text;
    }
    
    /**
     * 
     * @param bool $force
     */
    public function setLang($lang, $force = false)
    {
        $this->lang = $lang;
        foreach ($this->theItems as $item) {
            if ($force) {
                $item->setLang($this->lang);
                continue;
            } 
            if ($item->getLang() === '') {
                $item->setLang($this->lang);
            }

        }
    }
    
    /**
     * 
     * @param bool $force
     */
    public function setHandId($handId, $force = false)
    {
        $this->handId = $handId;
        foreach ($this->theItems as $item) {
            if ($force){
                $item->setHandId($this->handId);
                continue;
            } 
            if ($item->getHandId() === -1){
                $item->setHandId($this->handId);
            }
        }
    }
    
    public function isRtl()
    {
        $n = $this->nItems();
        $rtl = 0;
        foreach ($this->theItems as $item) {
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
     * @param \AverroesProject\TxText\ItemArray $newArray
     */
    public function getEditScript(ItemArray $newArray) 
    {
        $editScript = MyersDiff::calculate(
            $this->theItems,
            $newArray->theItems, 
            function ($a, $b) { return Item::isItemDataEqual($a, $b);}
        );
        
//        foreach ($editScript as &$command) {
//            $command[0]++;
//            $command[2]++;
//        }

        return $editScript;
    }
    
}
