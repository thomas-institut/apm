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
 * A piece of transcribed text is an array of TranscribedTextItem. 
 * Each TranscribedTextItem has a unique Id that identifies it in the system, 
 * and a reference to its parent ColumnElement.
 * 
 * Normally each TranscribedTextItem inherits language and hand from its
 * parent, but some may have a different one. EditorialNotes can refer to 
 * TranscribedTextItem's ids. 
 * 
 * Each TranscribedTextItem then has the following data:
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

namespace AverroesProject;

class TranscriptionText {
    
    /**
     *
     * @var TranscriptionTextItem[]
     */
    public $theItems;
    
    public $lang;
    public $editorId;
    public $handId;
    public static $deletionTechniques = [ 
        'dot-above', 
        'dot-above-dot-under',
        'dots-above',
        'dots-underneath',
        'strikeout'
    ];
    
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
        if (is_a($item, 'AverroesProject\TranscriptionTextItem')){
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
            throw new \InvalidArgumentException("Items added to a TranscriptionText should be TranscriptionTextItems, got " . get_class($item));
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
    
    public static function isDeletionTechniqueAllowed($technique){
        return in_array($technique, TranscriptionText::$deletionTechniques);
    }
}



class TranscriptionTextItem {

    /**
     *
     * @var int 
     * The element's unique id 
     */
    public $id;
    
    
   /**
    *
    * @var int
    * The column element Id to which
    * this item belongs
    */
    public $columnElementId;
    /**
     *
     * @var int $seq
     * The element's sequence number within the column element 
     */
    public $seq;
    /**
     * @var int type
     * @brief the item's type
     */
    public $type;
    
    // type constants
    const INVALID = 0;
    const TEXT = 1;
    const RUBRIC = 2;
    const SIC = 3;
    const UNCLEAR = 4;
    const ILLEGIBLE = 5;
    const GLIPH = 6;
    const ADDITION = 7;
    const DELETION = 8;
    const MARK = 9;
    const NO_LINEBREAK = 10;
    const ABBREVIATION = 11;
    
    /**
     *
     * @var string  
     * The element's language
     */
    public $lang;
    
    /**
     * @var int $handId
     * @brief The element's hand
     */
    public $handId;
    
    

    
    /**
     *
     * @var string
     */
    public $theText;
    
    /**
     * @var string
     * For SIC items, the correction
     * For UNCLEAR items, an alternative to the reading given with $theText
     */
    public $altText;
    
    /**
     *
     * @var string
     * For ADDITION: the placement
     * For ILLEGIBLE: the reason 
     * For DELETION: the technique
     * For UNCLEAR: the reason
     */
    public $extraInfo;
    
    /**
     *
     * @var int
     * For ILLEGIBLE items, the number of illegible characters
     */
    public $length;
    /**
     *
     * @var int
     * the id of the deletion to which an ADDITION corresponds
     */
    public $target;
    
    function getText(){
        return $this->theText;
    }
    
    function getLang(){
        return $this->lang;
    }
    
    function setLang($l){
        $this->lang = $l;
    }
    
    /**
     * 
     * @return int
     */
    function getHandId(){
        return $this->handId;
    }
    
    /**
     * 
     * @param int $h
     */
    function setHandId($h){
        $this->handId = (int) $h;
    }
            
    
    function __construct($i=0, $s = -1, $l='', $h=-1) {
        $this->id =(int) $i;
        $this->lang = (int) $l;
        $this->handId = (int) $h;
        $this->seq = (int) $s;
    }
    
    function isRtl(){
        switch($this->lang){
            case 'ar':
            case 'he':
                return TRUE;
                break;
            
            default:
                return FALSE;
                
        }
    }
}

class TtiText extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s, $theText) {
        parent::__construct($id, $s);
        $this->type = parent::TEXT;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("TEXT items need non-empty text");
        }
        $this->theText = $theText;
    }
   
}

class TtiRubric extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s,  $theText) {
        parent::__construct($id, $s);
        $this->type = parent::RUBRIC;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("RUBRIC items need non-empty text");
        }
        $this->theText = $theText;
    }

}

class TtiSic extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s, $theText, $correction='') {
        parent::__construct($id, $s);
        $this->type = parent::SIC;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("SIC items need non-empty text");
        }
        $this->theText = $theText;
        $this->altText = $correction;
    }

    function getCorrection(){
        return $this->altText;
    }
}

class TtiAbbreviation extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s, $theText, $expansion) {
        parent::__construct($id, $s);
        $this->type = parent::ABBREVIATION;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("ABBREVIATION items need non-empty text");
        }
        $this->theText = $theText;
        $this->altText = $expansion;
    }

    function getExpansion(){
        return $this->altText;
    }
}

class TtiUnclear extends TranscriptionTextItem {
    
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $reason
     * @param string $firstReading
     * @param string $altReading
     */
    function __construct($id, $s, $reason, $firstReading, $altReading='') {
        parent::__construct($id, $s);
        $this->type = parent::UNCLEAR;
        switch($reason){
            case 'unclear':
            case 'damaged':
                $this->extraInfo = $reason;
                break;
            
            default:
                throw new InvalidArgumentException("Unrecognized reason for UNCLEAR item, reason given: " . $reason);
        }
        if ($firstReading === NULL or $firstReading === ''){
            throw new InvalidArgumentException("Transcription items of type UNCLEAR need at least one reading, use ILLEGIBLE");
        }
        $this->theText = $firstReading;
        $this->altText = $altReading;
    }
    
    function getReason(){
        return $this->extraInfo;
    }
    
}

class TtiIllegible extends TranscriptionTextItem {
    
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $length
     * @param string $reason
     */
    function __construct($id, $s, $length, $reason='illegible') {
        parent::__construct($id, $s);
        $this->type = parent::ILLEGIBLE;
        
        if ($length <= 0 ){
            throw new InvalidArgumentException("Transcription items of type ILLEGIBLE need a length > 0, length given: " . $length);
        }
        $this->length = $length;
      
        switch($reason){
            case 'illegible':
            case 'damaged':
                $this->extraInfo = $reason;
                break;
            
            default:
                throw new InvalidArgumentException("Unrecognized reason for ILLEGIBLE item, reason given: " . $reason);
        }
    }
    
    function getReason(){
        return $this->extraInfo;
    }
    
    function getText(){
        
        $unknownChar = '🈑';
        
        return str_repeat($unknownChar, $this->length);
    }
    
    function getLength(){
        return $this->length;
    }
}

class TtiGliph extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s, $theText) {
        parent::__construct($id, $s);
        $this->type = parent::GLIPH;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("GLIPH items need non-empty text");
        }
        $this->theText = $theText;
    }
}

class TtiNoLinebreak extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     */
    function __construct($id, $s) {
        parent::__construct($id, $s);
        $this->type = parent::NO_LINEBREAK;
    }
    
    function getText(){
        return '';
    }
    
    function getNiceText(){
        switch ($this->lang){
            case 'ar':
            case 'he':
                return '🠸';
                
            default: 
                return '🠺';
        }
    }
}

class TtiMark extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     */
    function __construct($id, $s) {
        parent::__construct($id, $s);
        $this->type = parent::MARK;
    }
    
    function getText(){
        return '';
    }
}

class TtiDeletion extends TranscriptionTextItem {
    
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $text
     * @param string $technique     
     */
    function __construct($id, $s, $text, $technique) {
        parent::__construct($id, $s);
        $this->type = parent::DELETION;
        if (TranscriptionText::isDeletionTechniqueAllowed($technique)){
            $this->extraInfo = $technique;
        } else {
            throw new \InvalidArgumentException("Unrecognized technique for DELETION item, technique given: " . $technique);
        }
        if ($text === NULL or $text === ''){
            throw new \InvalidArgumentException("Transcription items of type DELETION need some deleted text");
        }
        $this->theText = $text;
    }
    
    /**
     * 
     * @return string
     * Returns the deletion tecnique
     */
    function getTechnique(){
        return $this->extraInfo;
    }
    
    /**
     * 
     * @return string
     * An alias of getTechnique
     */
    function getDeletionTechnique(){
        return $this->getTechnique();
    }
    
    
}

class TtiAddition extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $text
     * @param string $place
     * @param int $target
     */
    function __construct($id, $s, $text, $place, $target) {
        parent::__construct($id, $s);
        $this->type = parent::ADDITION;
        switch($place){
            case 'above':
            case 'below':
            case 'inline':
            case 'inspace':
            case 'overflow':
                $this->extraInfo = $place;
                break;
            
            default:
                throw new \InvalidArgumentException("Unrecognized placement for ADDITION item, placement given: " . $place);
        }
        if ($text === NULL or $text === ''){
            throw new \InvalidArgumentException("Transcription items of type ADDITION need some text");
        }
        $this->theText = $text;
        
        if ($target <= 0){
            $this->target = 0;
        } else {
            $this->target = $target;
        }
    }
}



