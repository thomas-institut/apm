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
 * Abstract class that represents a transcription item: a mark or a piece
 * of text that can appear in a document transcription.
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class Item {
    
    
    /** @var string */
    protected $location;
    const LOCATION_INLINE = '';
    
    /** @var int */
    protected $textualFlow;
    const FLOW_MAIN_TEXT = 0;
    const FLOW_ADDITION = 1;
    const FLOW_GLOSS = 2;
    
    /** @var array */
    protected $notes;
    
    abstract public function getPlainText();
    abstract public function getNormalizedText();
    
    public function __construct() {
        $this->setTextualFlow(self::FLOW_MAIN_TEXT);
        $this->setLocation(self::LOCATION_INLINE);
        $this->notes = [];
    }
    public function setLocation(string $loc) {
        $this->location = $loc;
    }
    
    public function getLocation() : string {
        return $this->location;
    }
    
    public function setTextualFlow(int $textualFlow) {
        $this->textualFlow = $textualFlow;
    }
    
    public function getTextualFlow() : int {
        return $this->textualFlow;
    }
    
    public function getNotes() : array  {
        return $this->notes;
    }
    
    public function setNotes(array $notes) {
        $noteClass = get_class(new Note());
        $this->notes = [];
        foreach($notes as $note) {
            if (!is_a($note, $noteClass)) {
                throw new \InvalidArgumentException('Expected Note object in array');
            }
            $this->notes[] = clone $note;
        }
    }
    
    public function addNote(Note $note) {
        $this->notes[] = $note;
    }
    
}
