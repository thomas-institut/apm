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

namespace AverroesProject\ColumnElement;

/**
 * The base class for all Column Elements
 */
class Element {

    /**
     *
     * @var int id
     * The element's unique id 
     */
    public $id;
    

    /**
     * Page Id to which the element belongs.
     * @var int 
     */
    public $pageId;
    /**
     *
     * @var int 
     *
     * The column number. 0 means the element is associated with the 
     * page rather than with one of the text columns 
     */
    public $columnNumber;
    /**
     *
     * @var int $seq
     * The element's sequence number within the column. By convention
     * the first element has sequence number 1
     */
    public $seq;
    
    /**
     * @var string $lang 
     * @brief The element's language
     */
    public $lang;
    
    /**
     * @var int $handId
     * @brief The element's hand
     */
    public $handId;
    
    /**
     * @var int $editor
     * @brief The element's editor
     */
    public $editorId;

    
    /**
     * @var string $timestamp
     * @brief a string representing the date and time the element was created
     */
    public $timestamp;
    
    /**
     * @var int type
     * @brief the element's type
     */
    public $type;
    
    // type constants
    const INVALID = 0;
    const LINE = 1;
    const HEAD = 2;
    const GLOSS = 3;
    const PAGE_NUMBER = 4;
    const CUSTODES = 5;
    const NOTE_MARK = 6;
    const ADDITION = 7;
    
    // 
    // Fields that may or may not be used depending on the type
    // of element
    // 
    
    /**
     *
     * @var ItemArray
     * The transcribed text  
     * 
     * In the DB it is not necessary because the transcribedText elements
     * will refer to the column element id.
     */
    public $items;
    /**
     *
     * @var int 
     * For items of type LINE, the line number
     * For items of type ADDITION: the mark or deletion ID
     */
    public $reference;
    /**
     *
     * @var string $placement
     * For items of type GLOSS, ADDITION and PAGE_NUMBER, 
     * a string stating the placement within the page or column
     */
    public $placement;
    
    public function __construct($id = 0, $colNumber = 0, $lang = '') {
        $this->id = $id;
        $this->columnNumber = $colNumber;
        $this->handId = 0;
        $this->items = new \AverroesProject\TxText\ItemArray();
        $this->lang = $lang;
        $this->editorId  = 0;
        $this->reference = NULL;
        $this->placement = NULL;
    }
    
    /**
     * @codeCoverageIgnore
     * @todo See whether this method is necessary at all.
     * 
     */
    function isRightToLeft(){
        switch($this->lang){
            case 'ar':
            case 'he':
                return true;
                
            default:
                return false;
        }
    }
    
}
