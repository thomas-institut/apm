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

namespace APM\Core\Token;

use APM\StandardData\StandardDataProvider;
use APM\StandardData\StandardTokenType;
use InvalidArgumentException;

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
 * A token can be a word, whitespace, punctuation or the empty token. Type constants are in the TokenType class
 * Word tokens can have a normalized version and a number of alternate versions.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Token {
    
    const DEFAULT_WHITESPACE_NORMALIZATION = ' ';

    const ERROR_WHITESPACE_IN_TEXT = 101;
    const ERROR_INVALID_TYPE = 102;
    
    
    /** @var int */
    private int $type;
    
    /** @var string */
    private string $text;
    
    /** @var string */
    private string $normalizedText;
    
    /** @var array */
    private array $alternateTexts;

    public function __construct(int $type, string $t, string $n = '') {
        if ($t === '') {
            $type = TokenType::EMPTY;
        }
        $this->setType($type);
        $this->setText($t);
        $this->setNormalization($n);
        if ($n === '' && $type===TokenType::WHITESPACE) {
            $this->setNormalization(self::DEFAULT_WHITESPACE_NORMALIZATION);
        }
        $this->alternateTexts = [];
    }
    
    /**
     * Creates an empty token
     * 
     * @return Token
     */
    static function emptyToken(): Token
    {
        return new Token(TokenType::EMPTY, '');
    }
    
    /**
     * Returns true if the token is empty
     * @return bool
     */
    public function isEmpty() : bool {
        return $this->type===TokenType::EMPTY;
    }

    /**
     * Set the token's text.
     *
     * @param string $str
     */
    public function setText(string $str) : void {
        $this->text = $str;
    }

    /**
     * Return's the token's text
     *
     * @return string
     */
    public function getText() : string {
        return $this->text;
    }

    /**
     * Return's the token's normalization, which defaults to the token's text if no
     * normalization has been set.
     *
     * @return string
     */
    public function getNormalization() : string {
        if ($this->normalizedText === '') {
            return $this->getText();
        }
        return $this->normalizedText;
    }

    /**
     * Sets the token's normalization
     *
     * @param string $str
     */
    public function setNormalization(string $str) : void {
        $this->normalizedText = $str;
    }

    /**
     * Sets the token's type
     * @param int $t
     */
    public function setType(int $t) : void {
        if (!TokenType::isValid($t)) {
            throw new InvalidArgumentException("Invalid type $t", self::ERROR_INVALID_TYPE);
        }
        $this->type = $t;
    }

    /**
     * Return's the token's type
     *
     * @return int
     */
    public function getType() : int {
        return $this->type;
    }

    public function getData() : array {
        return [
            'type' => $this->getType(),
            'text' => $this->getText(),
            'normalizedText' => $this->getNormalization()
        ];
    }

}
