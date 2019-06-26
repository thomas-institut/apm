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
     * Runs the collation engine on an array of witneses
     * 
     * The witnesses in the input array should be in the format expected by 
     * Collatex:
     * 
     *    $witness = [ 
     *                  'id' => 'WitnessID', 
     *                  'tokens' => [ 
     *                      ['t' => 'tokenText1', 'n' => 'normalization1', ...],
     *                      ['t' => 'tokenText2', 'n' => 'normalization2', ...],
     *                      ...
     *                  ]
     *               ]
     * @param array $witnessArray
     * @return array
     */
    abstract public function collate(array $witnessArray) : array;

    public function __construct(string $engineName) {
        parent::__construct($engineName);
    }
    

    
    
}
