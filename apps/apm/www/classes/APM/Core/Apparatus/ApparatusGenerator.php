<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
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
