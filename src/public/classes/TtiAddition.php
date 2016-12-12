<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
require_once 'TranscriptionTextItem.php';
/**
 * Description of TtiAddition
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TtiAddition extends TranscriptionTextItem {
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $text
     * @param string $place
     * @param int $target
     */
    function __construct($id, $s, $text, $place, $target) {
        parent::__construct($id, $s);
        $this->type = parent::ADDITION;
        switch($place){
            case 'above':
            case 'below':
            case 'inline':
            case 'inspace':
            case 'overflow':
                $this->extraInfo = $place;
                break;
            
            default:
                throw new \InvalidArgumentException("Unrecognized placement for ADDITION item, placement given: " . $place);
        }
        if ($text === NULL or $text === ''){
            throw new \InvalidArgumentException("Transcription items of type ADDITION need some text");
        }
        $this->theText = $text;
        
        if ($target <= 0){
            $this->target = 0;
        } else {
            $this->target = $target;
        }
    }
}