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

namespace APM\CollationEngine;

use APM\Engine\Engine;

/**
 * Abstraction of a collation engine such as Collatex
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class CollationEngine extends Engine {

    
     /**

     * @param array $witnessArray
     * @return array
     */


    /**
     * Runs the collation engine on an array of witnesses
     *
     * The witnesses in the input array should be in the format expected by
     * Collatex:
     *
     *    $witnessArray[]  = [
     *                  'id' => 'witnessId-N',
     *                  'tokens' => [
     *                      ['t' => 'tokenText1', 'n' => 'normalization1', 'witnessRef' => ref1...],
     *                      ['t' => 'tokenText2', 'n' => 'normalization2', 'witnessRef' => ref2...],
     *                      ...
     *                  ]
     *               ],
     *              [
     *
     * The output is an array with two elements:  $output['witnesses']
     * and $output['table']
     * $output['witnesses'] is an array with one element for each witness
     * processed
     *    $output['witnesses'] = ['witnessId1', 'witnessId2', ....]
     *
     *
     * $output['table'] is an array of segments.
     * Each segment is an array with one element per witness, each element contains
     * an array of tokens with a copy of one of the tokens given in the input.
     *
     * @param array $witnessArray
     * @return array
     */
    abstract public function collate(array $witnessArray) : array;

    public function __construct(string $engineName, string $engineVersion = "") {
        parent::__construct($engineName, $engineVersion);
    }
    

}
