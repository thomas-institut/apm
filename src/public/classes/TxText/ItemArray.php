<?php
/*
 * Copyright (C) 2016 Universität zu Köln
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

class ItemArray {
    
    /**
     *
     * @var TranscriptionTextItem[]
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
    
    
    function __construct($parent = 0, $lang = 'la', $editor = 0, $hand = 0) {
        
        $this->theItems = array();
        $this->lang = $lang;
        $this->editorId = (int) $editor;
        $this->handId = (int) $hand;
        $this->parentColumnElementId = (int) $parent;
    }
    
    /**
     * 
     * @param type $item
     * @param bool $ordered  (if true, items will be pushed into the array)
     * @throws InvalidArgumentException
     */
    function addItem($item, $ordered=false){
        if ($item instanceof Item){
            $seq = (int) $item->seq;
            if ( $seq !== -1 && !$ordered){
                $this->theItems[$seq] = $item;
                
            }
            else {
                $item->seq = count($this->theItems);
                array_push($this->theItems, $item);
            }
            
        }
        else{
            throw new \InvalidArgumentException("Objcts added to an ItemArray should be of class Item, got " . get_class($item));
        }
    }
    
    function getItem($seq){
        return $this->theItems[$seq];
    }
    
    function nItems(){
        return count($this->theItems);
    }
    
    function getText(){
        $text = '';
        foreach($this->theItems as $item){
            $text = $text . $item->getText();
        }
        return $text;
    }
    
    /**
     * 
     * @param bool $force
     */
    function setLanguageOnAllItems($force = FALSE){
        foreach ($this->theItems as $item){
            if ($force){
                $item->setLang($this->lang);
            } 
            else {
                if ($item->getLang() === ''){
                    $item->setLang($this->lang);
                }
            }
        }
    }
    
    /**
     * 
     * @param bool $force
     */
    function setHandOnAllItems($force = FALSE){
        foreach ($this->theItems as $item){
            if ($force){
                $item->setHandId($this->handId);
            } 
            else {
                if ($item->getHandId() === -1){
                    $item->setHandId($this->handId);
                }
            }
        }
    }
    
}
