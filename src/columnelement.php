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
 * @brief columnElement class
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 * 
 * 
 * Manuscripts are composed of items of type ColumnElement, which represent all 
 * possible elements that belong to a column or a page: 
 * 
 *      line | head | fw | gloss | off-flow addition | offline editorial note
 * 
 * All columnElement items have:
 *    id: unique Integer
 *    language:  ar | he | la | de | en | fr
 *    hand : Hand = SQL: hands.id
 *    editor: Editor  = SQL: people.id  (constraint: people.role includes 'editor')
 *    timestamp: DateTime
 *    page:  String  (DARE identifier)
 *    column: Integer  ( column = 0 means that the element is associated with the whole page)
 *    sequence: Integer 
 * 
 * line :
 *   theText : TranscribedText
 *   lineNumber : Integer   (this can be calculated based on the line's sequence 
 *                           once all lines are in)
 * head: 
 *   theText : TranscribedText 
 * 
 * gloss: 
 *   theText : TranscribedText
 *   placement:  left-margin | right-margin
 *
 * pageNumber : (usually by a different hand!)
 *   theNumber : TranscribedText 
 *   // perhaps also placement?
 * 
 * custodes: 
 *   theText : TranscribedText
 * 
 * offline note mark:
 *   a placeholder to which off-line editorial notes can be associated.
 * 
 *  off-flow addition: 
 *        theText : TranscribedText
 *        placement: margin-top | margin-bottom | margin-left | margin-right
 *        target: associated metamark or deletion id
 */




/**
 * @class columnElement 
 * Parent class of column elements
 * 
 */
class ColumnElement {

    /**
     *
     * @var int id
     * The element's unique id 
     */
    public $id;
    
    
    /**
     *
     * @var string
     * the document Id = DARE Id
     */
    public $documentId;
    
    /**
     *
     * @var string $page
     * Page ID (e.g. DARE id)
     */
    public $pageNumber;
    /**
     *
     * @var int $column
     * The column number. 0 means the element is associated with the 
     * page rather than with one of the text columns 
     */
    public $columnNumber;
    /**
     *
     * @var int $seq
     * The element's sequence number within the column 
     */
    public $seq;
    
    /**
     * @var string $lang 
     * @brief The element's language
     */
    public $lang;
    
    /**
     * @var int $hand 
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
    
    // fields that may change meaning depending on the 
    // type of columnElement
    /**
     *
     * @var TranscriptionText
     * The transcribed text  
     * In the DB it is not necessary because the transcribedText elements
     * will refer to the column element id.
     */
    public $transcribedText;
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
    
}


class CeLine extends ColumnElement {
    
    function getLineNumber(){
        return $this->reference;
    }
    
    /**
     * 
     * @param int $n
     */
    function setLineNumber($n){
        $this->reference = $n;
    }
}

class CeHead extends ColumnElement {
    
}

class CeGloss extends ColumnElement {
    
}

class CePageNumber extends ColumnElement {
    
}

class CeCustodes extends ColumnElement {
    
}

class CeNoteMark extends ColumnElement {
    
}

class CeAddition extends ColumnElement {
    
    function getTargetId(){
        return $this->reference;
    }
    
}