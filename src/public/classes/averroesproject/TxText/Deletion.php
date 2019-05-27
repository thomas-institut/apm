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

namespace AverroesProject\TxText;

/**
 * Description of TtiDeletion
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Deletion extends Item {
    
    public static $deletionTechniques = [ 
        'dot-above', 
        'dot-above-dot-under',
        'dots-above',
        'dots-underneath',
        'strikeout',
        'line-above',
        'no-sign'
    ];
    
    /**
     * the Xml Id associated with the deletion 
     * so that it can be matched with additions
     * (won't be stored in the database!)
     * @var string
     */
    public $modXmlId;
    
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
        if (self::isDeletionTechniqueAllowed($technique)){
            $this->extraInfo = $technique;
        } else {
            throw new \InvalidArgumentException("Unrecognized technique for DELETION item, technique given: " . $technique);
        }
        if ($text === NULL or $text === ''){
            throw new \InvalidArgumentException("Transcription items of type DELETION need some deleted text");
        }
        $this->theText = $text;
        $this->modXmlId = '';
    }
    
    /**
     * 
     * @return string
     * Returns the deletion technique
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
    
    public static function isDeletionTechniqueAllowed($technique){
        return in_array($technique, self::$deletionTechniques);
    }
    
    public function getXmlId() {
        return $this->modXmlId;
    }
    
    public function getPlainText() {
        return '';
    }
    
}