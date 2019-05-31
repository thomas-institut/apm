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

namespace APM\Core\Witness;

use APM\Core\Token\Token;


/**
 * Base class for text witnesses
 * 
 * A witness is associated with a work and with a chunk, both identified
 * as strings, and can be tought of as being composed of an array of textual
 * tokens out of which different views can be constructed. This base class
 * provides a basic plain text view, either normalized or not normalized. 
 * Descendant classes can provide other kinds of views.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class Witness {
    /**
     *
     * @var string
     */
    protected $work;
    
    /**
     *
     * @var string
     */
    protected $chunk;
    
    public function __construct(string $work, string $chunk) {
        $this->work = $work;
        $this->chunk = $chunk;
    }
    

    abstract public function getTokens() : array;
    
    /**
     * Returns a plain text version of the witness.
     * 
     * @param bool $normalized
     * @return string
     */
    public function getPlainText(bool $normalized = false) : string {
        $tokens = $this->getTokens();
        
        $plainText  = '';
        //$lastType = Token::TOKEN_UNDEFINED;
        foreach ($tokens as $t) {
            /* @var $t StringToken */
            $plainText .= $normalized ? $t->getNormalization() : $t->getText();
        }
        return $plainText;
    }
    
    public function getNormalizedPlainText() : string {
        return $this->getPlainText(true);
    }
    
    public function getWork() : string {
        return $this->work;
    }
    
    public function getChunk() : string {
        return $this->chunk;
    }
}
