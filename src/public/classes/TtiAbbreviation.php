<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
require_once 'TranscriptionTextItem.php';

/**
 * Description of TtiAbbreviation
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class TtiAbbreviation extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s, $theText, $expansion) {
        parent::__construct($id, $s);
        $this->type = parent::ABBREVIATION;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("ABBREVIATION items need non-empty text");
        }
        $this->theText = $theText;
        $this->altText = $expansion;
    }

    function getExpansion(){
        return $this->altText;
    }
}