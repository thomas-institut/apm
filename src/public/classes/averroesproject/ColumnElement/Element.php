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

namespace AverroesProject\ColumnElement;

use AverroesProject\TxText\Item;

/**
 * The base class for all Column Elements
 */
class Element {
    
    const LANG_NOT_SET = '';
    const ID_NOT_SET = -1;

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
    const SUBSTITUTION = 7;
    const LINE_GAP = 8;
    const ADDITION = 9;
    
    // 
    // Fields that may or may not be used depending on the type
    // of element
    // 
    
    /**
     *
     * @var array  
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
    
    public function __construct($id = self::ID_NOT_SET, 
            $colNumber = 0, $lang = self::LANG_NOT_SET)
    {
        $this->id = $id;
        $this->columnNumber = $colNumber;
        $this->handId = self::ID_NOT_SET;
        $this->items = [];
        $this->lang = $lang;
        $this->editorId  = self::ID_NOT_SET;
        $this->reference = null;
        $this->placement = null;
    }
    
    /**
     * @codeCoverageIgnore
     * @todo See whether this method is necessary at all.
     * 
     */
    function isRightToLeft()
    {
        switch($this->lang){
            case 'ar':
            case 'he':
                return true;
                
            default:
                return false;
        }
    }
    
    /**
     * Determines if element data is equal, ignoring seq, id and possibly editorId
     * 
     * @param Item $a
     * @param Item $b
     * @return boolean
     */
    public static function isElementDataEqual(Element $a, 
            Element $b, 
            $ignoreItems = true, 
            $ignoreEditorId = false, 
            $ignoreSequence = true) 
    {
        $dataA = get_object_vars($a);
        $dataB = get_object_vars($b);
       
        if ($ignoreSequence) {
            unset($dataA['seq']);
            unset($dataB['seq']);
        }
        unset($dataA['id']);
        unset($dataB['id']);
        unset($dataA['items']);
        unset($dataB['items']);
//        unset($dataA['reference']);
//        unset($dataB['reference']);
        if ($ignoreEditorId) {
            unset($dataA['editorId']);
            unset($dataB['editorId']);
        }
        if ($dataA != $dataB) {
            return false;
        }
        if ($ignoreItems) {
            return true;
        }
        if (count($a->items) !== count($b->items)) {
            return false;
        }
       
        for ($i = 0; $i < count($a->items); $i++){
            if (!Item::isItemDataEqual($a->items[$i], $b->items[$i])) {
                return false;
            }
        }
        return true;
    }
    
}
