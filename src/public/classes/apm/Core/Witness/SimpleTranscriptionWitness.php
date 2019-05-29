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

use APM\Core\Transcription\DocumentTranscription;
use APM\Core\Transcription\ItemAddressInDocument;

/**
 * A transcription witness that stores the DocumentTranscription 
 * inside
 * 
 * This is used for testing purposes
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SimpleTranscriptionWitness extends TranscriptionWitness {
    
    /** @var DocumentTranscription */
    protected $sourceTranscription;
    
    public function __construct(string $work, string $chunk, DocumentTranscription $dt) {
        parent::__construct($work, $chunk);
        $this->sourceTranscription = $dt;
    }
    
    public function getItemArray(): array {
        return $this->sourceTranscription->getItemRange(
                ItemAddressInDocument::NullAddress(), 
                ItemAddressInDocument::NullAddress());
    }

}
