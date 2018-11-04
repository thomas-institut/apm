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

namespace APM\Core\Item;

/**
 * A mark in the transcription: any kind of non-textual item that may or may
 * not represent text in the text box. For example: gaps, reference points, 
 * chunk marks, illegible characters, etc.
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Mark extends Item {
    
    /** @var string */
    private $type;
    
    /** @var string */
    private $text;
    
    /** @var int */
    private $length;
    
    private $data;
    
    const NO_TYPE = '';
    const NO_TEXT = '';
    const NO_LENGTH = '';
            
    
    public function __construct(string $type = self::NO_TYPE, string $text = self::NO_TEXT) {
        $this->type = $type;
        $this->text = $text;
        $this->length = self::NO_LENGTH;
    }
    
    public function getPlainText(){
        return '';
    }
    public function getNormalizedText() {
        return '';
    }
    
    public function getMarkText() {
        return $this->text;
    }
    
    protected function setMarkText(string $text) {
        $this->text = $text;
    }
    
    public function getMarkType() {
        return $this->type;
    }
    
    public function getLength() : int {
        return $this->length;
    }
    
    public function setLength(int $l) {
        $this->length = $l;
    }
}
