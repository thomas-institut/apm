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

namespace AverroesProject;

/**
 * Description of TranscriptionTextItem
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
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
    
    //  
    //  Element type constants
    // 
    const INVALID =         0;
    const TEXT =            1;
    const RUBRIC =          2;
    const SIC =             3;
    const UNCLEAR =         4;
    const ILLEGIBLE =       5;
    const GLIPH =           6;
    const ADDITION =        7;  
    const DELETION =        8;
    const MARK =            9;
    const NO_LINEBREAK =   10;
    const ABBREVIATION =   11;
    const LINEBREAK    =   12;
    
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
        $this->lang = $l;
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
