<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
require_once 'TranscriptionTextItem.php';
/**
 * Description of TtiGliph
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TtiGliph extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $theText
     */
    function __construct($id, $s, $theText) {
        parent::__construct($id, $s);
        $this->type = parent::GLIPH;
        if ($theText === NULL or $theText ===''){
            throw new InvalidArgumentException("GLIPH items need non-empty text");
        }
        $this->theText = $theText;
    }
}