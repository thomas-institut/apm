<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;


/**
 * Description of TtiMark
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TtiMark extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     */
    function __construct($id, $s) {
        parent::__construct($id, $s);
        $this->type = parent::MARK;
    }
    
    function getText(){
        return '';
    }
}