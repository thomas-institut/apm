<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;

/**
 * Description of TtiUnclear
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TtiUnclear extends TranscriptionTextItem {
    
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $reason
     * @param string $firstReading
     * @param string $altReading
     */
    function __construct($id, $s, $reason, $firstReading, $altReading='') {
        parent::__construct($id, $s);
        $this->type = parent::UNCLEAR;
        switch($reason){
            case 'unclear':
            case 'damaged':
                $this->extraInfo = $reason;
                break;
            
            default:
                throw new InvalidArgumentException("Unrecognized reason for UNCLEAR item, reason given: " . $reason);
        }
        if ($firstReading === NULL or $firstReading === ''){
            throw new InvalidArgumentException("Transcription items of type UNCLEAR need at least one reading, use ILLEGIBLE");
        }
        $this->theText = $firstReading;
        $this->altText = $altReading;
    }
    
    function getReason(){
        return $this->extraInfo;
    }
    
}