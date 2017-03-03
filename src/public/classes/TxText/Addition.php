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
 * Description of TtiAddition
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Addition extends Item {
    
     public static $validPlaces = [ 
        'above',
        'below',
        'inline',
        'inspace',
        'overflow'
    ];
    
    
    /**
     * The Xml ID associated with the target
     * (won't be stored in the database!)
     * @var string
     */
    // Only needed to support inline targets!
    //public $targetXmlId;
     
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $text
     * @param string $place
     * @param int $target
     */
    function __construct($id, $s, $text, $place, $target=0) {
        parent::__construct($id, $s);
        $this->type = parent::ADDITION;
        if (!self::isPlaceValid($place)){
            throw new \InvalidArgumentException("Unrecognized placement for ADDITION item, placement given: " . $place);
        }
        if ($text === NULL or $text === ''){
            throw new \InvalidArgumentException("Transcription items of type ADDITION need some text");
        }
        $this->theText = $text;
        $this->setTarget($target);
        $this->setPlace($place);
        $this->targetXmlId = '';
    }

    public static function isPlaceValid($place){
        return in_array($place, self::$validPlaces);
    }
    
    public function setTarget($target)
    {
        if ($target <= 0){
            $this->target = 0;
        } else {
            $this->target = $target;
        }
    }
    
    public function getTarget()
    {
        return $this->target;
    }
    
    public function setPlace($place) 
    {
        $this->extraInfo = $place;
    }
    
    public function getPlace()
    {
        return $this->extraInfo;
    }
}