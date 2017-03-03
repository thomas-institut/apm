<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\ColumnElement;

/**
 * Description of Gloss
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class Gloss extends Element
{
    
    public function __construct($id = 0, $colNumber = 0, $lang = '')
    {
        parent::__construct($id, $colNumber, $lang);
        $this->type = parent::GLOSS;
    }
    
}