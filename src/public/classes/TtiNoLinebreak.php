<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;

/**
 * Description of TtiNoLinebreak
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TtiNoLinebreak extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     */
    function __construct($id, $s) {
        parent::__construct($id, $s);
        $this->type = parent::NO_LINEBREAK;
    }
    
    function getText(){
        return '';
    }
    
    function getNiceText(){
        switch ($this->lang){
            case 'ar':
            case 'he':
                return '🠸';
                
            default: 
                return '🠺';
        }
    }
}