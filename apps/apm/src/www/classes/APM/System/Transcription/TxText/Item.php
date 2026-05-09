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

namespace APM\System\Transcription\TxText;

/**
 * Description of TranscriptionTextItem
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Item {

    const int ID_NOT_SET = -1;
    const int SEQ_NOT_SET = -1;
    const string LANG_NOT_SET = '';
    /**
     *
     * @var int 
     * The element's unique id 
     */
    public int $id = -1;
    
    
   /**
    *
    * @var int
    * The column element Id to which
    * this item belongs
    */
    public int $columnElementId = -1;
    /**
     *
     * @var int $seq
     * The element's sequence number within the column element 
     */
    public int $seq = -1;
    /**
     * @var int type
     * @brief the item's type
     */
    public int $type = 0;
    
    //  
    //  Element type constants
    // 
    const int INVALID =         0;
    const int TEXT =            1;
    const int RUBRIC =          2;
    const int SIC =             3;
    const int UNCLEAR =         4;
    const int ILLEGIBLE =       5;
    const int GLIPH =           6;
    const int ADDITION =        7;
    const int DELETION =        8;
    const int MARK =            9;
    const int NO_WORD_BREAK =   10;
    const int ABBREVIATION =   11;
    const int LINEBREAK    =   12;
    const int INITIAL  =   13;
    const int CHUNK_MARK = 14;
    const int CHARACTER_GAP = 15;
    const int PARAGRAPH_MARK = 16;
    const int MATH_TEXT = 17;
    const int MARGINAL_MARK = 18;
    const int BOLD_TEXT = 19;
    const int ITALIC = 20;
    const int HEADING = 21;
    const int CHAPTER_MARK = 22;


    /**
     * The item's language
     */
    public string $lang = '';
    
    /**
     * The item's hand
     */
    public int $handId = -1;

    public string $theText = '';
    
    /**
     * For SIC items, the correction
     * For UNCLEAR items, an alternative to the reading given with $theText
     */
    public string $altText = '';
    
    /**
     * For ADDITION: the placement
     * For ILLEGIBLE: the reason 
     * For DELETION: the technique
     * For UNCLEAR: the reason
     */
    public string $extraInfo = '';
    
    /**
     *
     * For ILLEGIBLE items, the number of illegible characters
     */
    public int $length = -1;
    /**
     *
     * the id of the deletion to which an ADDITION corresponds
     */
    public int $target = -1;
    
    public function getText(): string
    {
        return $this->theText;
    }
    
    public function getAltText(): string
    {
        return $this->altText;
    }
    
    public function getPlainText() : string
    {
        mb_regex_encoding('UTF-8');
        $theText = $this->getText();
        $normalized = mb_ereg_replace('\s\s+', ' ', $theText);
        if ($normalized === false || $normalized === null) {
            return '';
        }
        return mb_ereg_replace('\n', ' ', $normalized);
    }
    
    public function getLang() : string{
        return $this->lang;
    }
    
    function setLang($l): void
    {
        $this->lang = $l;
    }
    

    function getHandId(): int
    {
        return $this->handId;
    }
    
    function setHandId(int $h) : void{
        $this->handId = $h;
    }
     
    function setColumnElementId(int $id): void
    {
        $this->columnElementId = $id;
    }
    
    function __construct(int $i=self::ID_NOT_SET, int $s = self::SEQ_NOT_SET,
            string $l = self::LANG_NOT_SET, int $h = self::ID_NOT_SET)
    {
        $this->id = $i;
        $this->lang = $l;
        $this->handId = $h;
        $this->seq = $s;
        $this->columnElementId = self::ID_NOT_SET;
        $this->altText = '';
        $this->extraInfo = '';
    }

    /**
     * Normalizes a string according to rules for textual items:
     *   - trims all whitespace at the beginning of the string
     *   - converts all whitespace at the end of the string to a
     *     single space
     *   - converts all whitespace inside the string to a single space
     *
     * @param string $str
     * @return false|string
     */
    public static function normalizeString(string $str): false|string
    {
        $normalized = trim($str);
        if (trim(mb_substr($str, -1)) === ''){
            $normalized .= ' ';
        }
        return mb_ereg_replace('\s+', ' ', $normalized);
    }
    
    
    /**
     * Determines if everything but the id and the seq of two
     * items are equals
     * 
     * @param Item $a
     * @param Item $b
     * @return boolean
     */
    public static function isItemDataEqual(Item $a, Item $b): bool
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
