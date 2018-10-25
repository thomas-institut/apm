<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM\Core\Apparatus;

use APM\Core\Token\Token;
/**
 * Description of ApparatusGenerator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApparatusGenerator {
 
    public static function genEntryForColumn(array $column, string $mainReading, string $lemma='') {
        $omissions = [];
        $additions = [];
        $variants = [];
        
        if ($lemma === '') {
            $lemma = $mainReading;
        }
        $entry = '';
        
        foreach ($column as $siglum => $token) {
            /* @var $token Token */
            if ($token->isEmpty()){
                if ($mainReading !== '')  {
                    $omissions[] = $siglum;
                }
                continue;
            }
            $normalization = $token->getNormalization();
            if ($mainReading === '') {
                $additions[$siglum] = $token->getNormalization();
                continue;
            }
            if ($mainReading !== $token->getNormalization()) {
                $variants[$siglum] = $token->getNormalization();
            }
        }
        
        
        
        if (count($omissions) !== 0) {
            foreach($omissions as $siglum) {
                $entry .= $siglum;
            }
            $entry .= ' om. ';
        }
        
        foreach($additions as $siglum => $addedText) {
            $entry .= $siglum . ':+' . $addedText . ' ';
        }
        
        foreach($variants as $siglum => $variant) {
            $entry .= $siglum . ':' . $variant . ' ';
        }
        
        if ($entry === '') {
            // nothing in the apparatus
            return '';
        }
        
        $entry = $lemma . '] ' . $entry;
        
        return $entry;
    }
}
