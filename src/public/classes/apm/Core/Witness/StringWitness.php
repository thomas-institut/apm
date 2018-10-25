<?php

/*
 * 
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

use APM\Core\Token\StringTokenizer;
use APM\Core\Token\Token;

/**
 * A Witness whose source is a single text string.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class StringWitness extends Witness {
    
    private $sourceString;
    
    public function __construct(string $work, string $chunk, string $text) {
        parent::__construct($work, $chunk);
        $this->sourceString = $text;
    }
    
    public function getTokens() : array {
        $rawTokens = StringTokenizer::getTokensFromString($this->sourceString);
        $tokens = [];
        // Filter out whitespace tokens
        foreach ($rawTokens as $rt) {
            if ($rt->getType() === Token::TOKEN_WORD || $rt->getType()===Token::TOKEN_PUNCT) {
                $tokens[] = $rt;
            }
        }
        return $tokens;
    }
    
    public function getSourceString() : string {
        return $this->sourceString;
    }

}
