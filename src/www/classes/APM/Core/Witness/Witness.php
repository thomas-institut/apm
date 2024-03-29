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

use APM\Core\Token\NormalizationSource;
use APM\Core\Token\Normalizer\WitnessTokenNormalizer;
use APM\Core\Token\Token;


/**
 * Base class for text witnesses
 * 
 * A witness is associated with a work and with a chunk, both identified
 * as strings, and can be thought of as being composed of an array of textual
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
    protected string $work;
    
    /**
     *
     * @var int
     */
    protected $chunk;
    /**
     * @var string
     */
    protected string $localWitnessId;
    /**
     * @var string
     */
    protected string $lang;


    public function __construct(string $work, string $chunk, string $localWitnessId = 'A') {
        $this->work = $work;
        $this->chunk = $chunk;
        $this->localWitnessId = $localWitnessId;
        $this->setLang('');
    }

    public function setLang(string $langCode) {
        $this->lang = $langCode;
    }

    public function getLang() : string {
        return $this->lang;
    }


    /**
     * @return Token[]
     */
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
        foreach ($tokens as $t) {
            /* @var $t Token */
            $plainText .= $normalized ? $t->getNormalization() : $t->getText();
        }
        return $plainText;
    }
    
    public function getNormalizedPlainText() : string {
        return $this->getPlainText(true);
    }
    
    public function getWorkId() : string {
        return $this->work;
    }
    
    public function getChunk() : string {
        return $this->chunk;
    }

    public function getLocalWitnessId() : string {
        return $this->localWitnessId;
    }

    public function getData() : array {
        return [
            'workId' => $this->getWorkId(),
            'chunk' => $this->getChunk(),
            'localWitnessId' => $this->getLocalWitnessId(),
            'lang' => $this->getLang()
        ];
    }

    abstract public function applyTokenNormalization(WitnessTokenNormalizer  $normalizer, bool $overWriteCurrentNormalizations, string $source = NormalizationSource::DEFAULT);

}
