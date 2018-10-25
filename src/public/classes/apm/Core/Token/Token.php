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

namespace APM\Core\Token;

/**
 * A textual token from a witness.
 * 
 * This class captures the basic functionality of a witness textual token. 
 * In general, every type of witness (a descendant of the Witness abstract
 * class) will be associated with a token type derived from this class.  These
 * descendant Token types normally will only add some information and functionality
 * required to deal with that specific kind of witness. The SimpleWitness class 
 * implements a Witness that is composed of explicitly given Token objects.
 * 
 * A token can be a word, whitespace, punctuation or the empty token.  
 * Word tokens can have a normalized version and a number of alternate versions.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Token {
    
    const TOKEN_UNDEFINED = 0;
    const TOKEN_WORD = 1;
    const TOKEN_WS = 2;
    const TOKEN_PUNCT = 3;
    const TOKEN_EMPTY = 4;
    
    const __MAX_TYPE = 4;
    
    
    /** @var int */
    private $type;
    
    /** @var string */
    private $text;
    
    /** @var string */
    private $normalizedText;
    
    /** @var array */
    private $alternateTexts;

    public function __construct(int $type, string $t, string $n = '') {
        if ($t === '') {
            $type = self::TOKEN_EMPTY;
        }
        $this->setType($type);
        $this->setText($t);
        $this->setNormalization($n);
        $this->alternateTexts = [];
    }
    
    /**
     * Creates an empty token
     * 
     * @return \APM\Core\Token\Token
     */
    static function emptyToken() {
        return new Token(self::TOKEN_EMPTY, '');
    }
    
    /**
     * Returns true if the token is empty
     * @return bool
     */
    public function isEmpty() {
        return $this->type===self::TOKEN_EMPTY;
    }
    
    public function setText(string $t) {
        // TODO: check that there's no whitespace in the given text
        $this->text = $t;
    }
    
    public function getText() {
        return $this->text;
    }
    
    public function getNormalization() {
        if ($this->normalizedText === '') {
            return $this->getText();
        }
        return $this->normalizedText;
    }
    
    public function setNormalization(string $n) {
        $this->normalizedText = $n;
    }
    
    public function setType(int $t) {
        if ($t > self::__MAX_TYPE || $t < 0) {
            $this->type = self::TOKEN_UNDEFINED;
            return;
        }
        $this->type = $t;
    }
    
    public function getType() {
        return $this->type;
    }
}
