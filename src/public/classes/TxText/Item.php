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

namespace AverroesProject\TxText;

/**
 * Description of TranscriptionTextItem
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Item {

    const ID_NOT_SET = -1;
    const SEQ_NOT_SET = -1;
    const LANG_NOT_SET = '';
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
    const NO_WORD_BREAK =   10;
    const ABBREVIATION =   11;
    const LINEBREAK    =   12;
    const INITIAL  = 13;
    const CHUNK_MARK = 14;
    const CHARACTER_GAP = 15;
    const PARAGRAPH_MARK = 16;
    const MATH_TEXT = 17;


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
    
    public function getText(){
        return $this->theText;
    }
    
    public function getAltText() {
        return '';
    }
    
    public function getPlainText() {
        return $this->getText();
    }
    
    public function getLang(){
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
     
    function setColumnElementId($id)
    {
        $this->columnElementId = $id;
    }
    
    function __construct($i=self::ID_NOT_SET, $s = self::SEQ_NOT_SET, 
            $l = self::LANG_NOT_SET, $h = self::ID_NOT_SET)
    {
        $this->id =(int) $i;
        $this->lang = $l;
        $this->handId = (int) $h;
        $this->seq = (int) $s;
        $this->columnElementId = self::ID_NOT_SET;
    }
    
    function isRtl()
    {
        switch($this->lang){
            case 'ar':
            case 'he':
                return TRUE;
                break;
            
            default:
                return FALSE;
            
        }
    }
    
    /**
     * Normalizes a string according to rules for textual items:
     *   - trims all whitespace at the beginning of the string
     *   - converts all whitespace at the end of the string to a
     *     single space
     *   - converts all whitespace inside the string to a single space
     * 
     * @param string $str
     */
    public static function normalizeString(string $str){
        $normalized = trim($str);
        if (trim(substr($str, -1)) === ''){
            $normalized .= ' ';
        }
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        return $normalized;
    }
    
    
    /**
     * Determines if everything but the id and the seq of two
     * items are equals
     * 
     * @param Item $a
     * @param Item $b
     * @return boolean
     */
    public static function isItemDataEqual(Item $a, Item $b) 
    {
       $dataA = get_object_vars($a);
       $dataB = get_object_vars($b);
       
       unset($dataA['seq']);
       unset($dataB['seq']);
       unset($dataA['id']);
       unset($dataB['id']);
       unset($dataA['columnElementId']);
       unset($dataB['columnElementId']);
       
       return $dataA == $dataB;
    }
}
