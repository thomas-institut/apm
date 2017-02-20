<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;

/**
 * Description of TtiDeletion
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TtiDeletion extends TranscriptionTextItem {
    
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $text
     * @param string $technique     
     */
    function __construct($id, $s, $text, $technique) {
        parent::__construct($id, $s);
        $this->type = parent::DELETION;
        if (TranscriptionText::isDeletionTechniqueAllowed($technique)){
            $this->extraInfo = $technique;
        } else {
            throw new \InvalidArgumentException("Unrecognized technique for DELETION item, technique given: " . $technique);
        }
        if ($text === NULL or $text === ''){
            throw new \InvalidArgumentException("Transcription items of type DELETION need some deleted text");
        }
        $this->theText = $text;
    }
    
    /**
     * 
     * @return string
     * Returns the deletion tecnique
     */
    function getTechnique(){
        return $this->extraInfo;
    }
    
    /**
     * 
     * @return string
     * An alias of getTechnique
     */
    function getDeletionTechnique(){
        return $this->getTechnique();
    }
    
    
}