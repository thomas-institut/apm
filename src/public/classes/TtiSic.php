<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;

/**
 * Description of TtiSic
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class TtiSic extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s, $theText, $correction='') {
        parent::__construct($id, $s);
        $this->type = parent::SIC;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("SIC items need non-empty text");
        }
        $this->theText = $theText;
        $this->altText = $correction;
    }

    function getCorrection(){
        return $this->altText;
    }
}
