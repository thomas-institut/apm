<?php

/*
 *  Copyright (C) 2016 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject;

use \Matcher\Token;

/**
 * Description of XmlToken
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class XmlToken extends Token {
    
    var $type;
    var $name;
    var $reqAttr;
//    var $allowedAttr;
    
    public function __construct($type, $name = '*') {
        $this->type = $type;
        $this->name = $name;
        $this->reqAttr = [];
    }
    public function addReqAttrs($attrs){
        $copy = clone $this;
        foreach($attrs as $atr){
            $copy->reqAttr[]  = $atr;
        }
        return $copy;
    }
    
    public function matches($r) {
        if (!$this->matchValue($this->type, $r->nodeType)){
            return false;
        }
        
        if (!$this->matchValue($this->name, $r->name)){
            return false;
        }
        if (!$this->matchRequiredAttributes($r)){
            return false;
        }
        return true;
    }
    
    //
    // Factory Functions
    public static function elementToken($name){
        return new XmlToken(\XMLReader::ELEMENT, $name);
    }
    
    public static function endElementToken($name = '*'){
        return new XmlToken(\XMLReader::END_ELEMENT, $name);
    }
    
    public static function textToken(){
        return new XmlToken(\XMLReader::TEXT);
    }
    
    //
    // Utility Functions
    //
    private function matchValue($cond, $value){
        if ($cond === '*'){
            return true;
        } 
        else {
            if ($cond === $value){
                return true;
            }
        }
        return false;
    }
    
    private function matchRequiredAttributes($r){
        // Attributes only make sense in xml elements!
        if ($this->type !== \XMLReader::ELEMENT){
            return true;
        }
        foreach ($this->reqAttr as $atr){
            $value = $r->getAttribute($atr[0]);
            if (is_null($value)){
                return false;
            }
            if (!$this->matchValue($atr[1], $value)){
                return false;
            }
        }
        return true;
    }
    
    
}
