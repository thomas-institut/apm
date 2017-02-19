<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;

/**
 * Description of TtiIllegible
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TtiIllegible extends TranscriptionTextItem {
    
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $length
     * @param string $reason
     */
    function __construct($id, $s, $length, $reason='illegible') {
        parent::__construct($id, $s);
        $this->type = parent::ILLEGIBLE;
        
        if ($length <= 0 ){
            throw new InvalidArgumentException("Transcription items of type ILLEGIBLE need a length > 0, length given: " . $length);
        }
        $this->length = $length;
      
        switch($reason){
            case 'illegible':
            case 'damaged':
                $this->extraInfo = $reason;
                break;
            
            default:
                throw new InvalidArgumentException("Unrecognized reason for ILLEGIBLE item, reason given: " . $reason);
        }
    }
    
    function getReason(){
        return $this->extraInfo;
    }
    
    function getText(){
        
        $unknownChar = '🈑';
        
        return str_repeat($unknownChar, $this->length);
    }
    
    function getLength(){
        return $this->length;
    }
}
