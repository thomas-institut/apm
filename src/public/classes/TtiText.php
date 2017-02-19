<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;

/**
 * Description of TtiText
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class TtiText extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s, $theText) {
        parent::__construct($id, $s);
        $this->type = parent::TEXT;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("TEXT items need non-empty text");
        }
        $this->theText = $theText;
    }
   
}
