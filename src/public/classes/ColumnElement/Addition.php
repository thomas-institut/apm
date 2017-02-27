<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\ColumnElement;

/**
 * Description of Addition
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Addition extends Element {
        
    public function __construct()
    {
        $this->type = parent::ADDITION;
    }
    
    function getTargetId(){
        return $this->reference;
    }
    
}