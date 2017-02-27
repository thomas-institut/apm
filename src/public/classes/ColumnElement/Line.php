<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\ColumnElement;

/**
 * Description of Line
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class Line extends Element {
    
    public function __construct()
    {
        $this->type = parent::LINE;
    }
    
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
