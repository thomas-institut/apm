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

namespace APM\System\Transcription\ColumnElement;

use APM\System\Transcription\TxText\Item;

/**
 * The base class for all Column Elements
 */
class Element {
    
    const string LANG_NOT_SET = '';
    const int ID_NOT_SET = -1;

    /**
     *
     * @var int id
     * The element's unique id 
     */
    public int $id;
    

    /**
     * Page id to which the element belongs.
     * @var int 
     */
    public int $pageId;
    /**
     *
     * @var int 
     *
     * The column number. 0 means the element is associated with the 
     * page rather than with one of the text columns 
     */
    public int $columnNumber;
    /**
     *
     * @var int $seq
     * The element's sequence number within the column. By convention
     * the first element has sequence number 1
     */
    public int $seq;
    
    /**
     * @var string $lang 
     * @brief The element's language
     */
    public string $lang;
    
    /**
     * @var int $handId
     * @brief The element's hand
     */
    public int $handId;
    
    /**
     * The editor's userId
     *
     * Use editorTid instead
     *
     * @var int
     * @deprecated
     */
    public int $editorId;

    /**
     * @var int
     */
    public int $editorTid;

    /**
     * @var int type
     * @brief the element's type
     */
    public int $type;
    
    // type constants
    const int INVALID = 0;
    const int LINE = 1;
    const int HEAD = 2;
    const int GLOSS = 3;
    const int PAGE_NUMBER = 4;
    const int CUSTODES = 5;
    const int NOTE_MARK = 6;
    const int SUBSTITUTION = 7;
    const int LINE_GAP = 8;
    const int ADDITION = 9;
    
    // 
    // Fields that may or may not be used depending on the type
    // of element
    // 
    
    /**
     *
     * @var Item[]
     * The transcribed text  
     * 
     * In the DB it is not necessary because the transcribedText elements
     * will refer to the column element id.
     */
    public array $items;
    /**
     *
     * @var ?int
     * For items of type LINE, the line number
     * For items of type ADDITION: the mark or deletion ID
     */
    public ?int $reference;
    /**
     *
     * @var ?string
     * For items of type GLOSS, ADDITION and PAGE_NUMBER, 
     * a string stating the placement within the page or column
     */
    public ?string $placement;
    
    public function __construct($id = self::ID_NOT_SET, 
            $colNumber = 0, $lang = self::LANG_NOT_SET)
    {
        $this->id = $id;
        $this->columnNumber = $colNumber;
        $this->handId = self::ID_NOT_SET;
        $this->items = [];
        $this->lang = $lang;
        $this->editorId  = self::ID_NOT_SET;
        $this->editorTid = 0;
        $this->reference = null;
        $this->placement = null;
    }

    /**
     * Determines if element data is equal, ignoring seq, id and possibly editorId
     *
     * @param Element $a
     * @param Element $b
     * @param bool $ignoreItems
     * @param bool $ignoreEditorTid
     * @param bool $ignoreSequence
     * @return boolean
     */
    public static function isElementDataEqual(Element $a,
                                              Element $b,
                                              bool    $ignoreItems = true,
                                              bool    $ignoreEditorTid = false,
                                              bool    $ignoreSequence = true): bool
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
        if ($ignoreEditorTid) {
            unset($dataA['editorId']);
            unset($dataB['editorId']);
            unset($dataA['editorTid']);
            unset($dataB['editorTid']);
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
