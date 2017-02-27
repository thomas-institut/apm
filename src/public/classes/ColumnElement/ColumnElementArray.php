<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\ColumnElement;

/**
 * Description of ColumnElementArray
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
// Some useful functions wrapped here

class ColumnElementArray{
    static function getMainLanguage($cearray){
        $langs = array();
        foreach ($cearray as $e){
            if (isset($langs[$e->lang])){
                $langs[$e->lang]++;
            }
            else {
                $langs[$e->lang] = 1;
            }
        }
     
        return array_search(max($langs), $langs);
    }
    
    static function isRightToLeft($cearray){
        switch(ColumnElementArray::getMainLanguage($cearray)){
            case 'ar':
            case 'he':
                return TRUE;
                
            default:
                return FALSE;
        }
    }
}