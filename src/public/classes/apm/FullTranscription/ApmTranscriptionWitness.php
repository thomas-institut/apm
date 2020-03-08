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

namespace APM\FullTranscription;

use APM\Core\Item\ItemWithAddress;
use APM\Core\Witness\TranscriptionWitness;
use APM\System\WitnessType;
use AverroesProjectToApm\DatabaseItemStream;


/**
 * A transcription witness whose source is a 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmTranscriptionWitness extends TranscriptionWitness {
    /**
     *
     * @var DatabaseItemStream
     */
    private $databaseItemStream;
    
    
    /** @var array */
    private $initialLineNumbers;
    /**
     * @var int
     */
    private $docId;
    /**
     * @var string
     */
    private $timeStamp;

    public function __construct(int $docId, string $work, string $chunk, string $localWitnessId, string $timeString, DatabaseItemStream $stream) {
        parent::__construct($work, $chunk, $localWitnessId);
        
        $this->docId = $docId;
        $this->timeStamp = $timeString;
        
        $this->databaseItemStream = $stream;
        $this->initialLineNumbers = [];
        
    }

    public function getTimeStamp() : string {
        return $this->timeStamp;
    }

    public function getDocId(): int {
        return $this->docId;
    }
    
    public function getDatabaseItemStream() : DatabaseItemStream {
        return $this->databaseItemStream;
    }

    public function getItemArray(): array {
        return $this->databaseItemStream->getItems();
    }

    
    public function getInitialLineNumberForTextBox(int $pageId, int $textBox) : int {
        if (isset($this->initialLineNumbers[$pageId][$textBox])) {
            return $this->initialLineNumbers[$pageId][$textBox];
        }
        return 1;
    }
    
    public function setInitialLineNumberForTextBox(int $pageId, int $textBox, int $lineNumber) {
        if (!isset($this->initialLineNumbers[$pageId])) {
            $this->initialLineNumbers[$pageId] = [];
        }
        $this->initialLineNumbers[$pageId][$textBox] = $lineNumber;
    }

    /**
     * Returns and array of ItemWithAddress objects that
     * represents the source transcription and from which
     * the tokens will be constructed.
     *
     * This function is used to
     *
     * @return ItemWithAddress[]
     */
    function getItemWithAddressArray(): array
    {
        return $this->databaseItemStream->getItems();
    }

    public function getData(): array {
        $data = parent::getData();

        $data['witnessType'] = WitnessType::FULL_TRANSCRIPTION;
        $data['timeStamp'] = $this->getTimeStamp();
        $data['docId'] = $this->getDocId();

        return $data;
    }
}
