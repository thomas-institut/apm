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
    
    public function __construct($id = 0, $colNumber = 0, $lang = '')
    {
        parent::__construct($id, $colNumber, $lang);
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
    
    public static function createNewLineWithText($text)
    {
        $text = new \AverroesProject\TxText\Text(0, 1, "Some text");
        $element = new Line();
        $element->items->addItem($text, true);
        return $element;
    }
}
