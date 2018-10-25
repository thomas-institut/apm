<?php

/*
 * Copyright (C) 2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
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
     * Returns a plain text version of the witness
     * 
     * @param bool $normalized
     * @return string
     */
    public function getPlainText(bool $normalized = false) : string {
        $tokens = $this->getTokens();
        
        $plainText  = '';
        $lastType = Token::TOKEN_UNDEFINED;
        foreach ($tokens as $t) {
            /* @var $t StringToken */
            $text = $normalized ? $t->getNormalization() : $t->getText();
            $currentType = $t->getType();
            if ($currentType === Token::TOKEN_WS) {
                continue;
            }
            if ($lastType===Token::TOKEN_UNDEFINED || $currentType===Token::TOKEN_PUNCT) {
                $plainText .= $text;
            } else {
                $plainText .= ' ' . $text;
            }
            $lastType = $currentType;
            
        }
        return $plainText;
    }
    
    public function getWork() : string {
        return $this->work;
    }
    
    public function getChunk() : string {
        return $this->chunk;
    }
}
