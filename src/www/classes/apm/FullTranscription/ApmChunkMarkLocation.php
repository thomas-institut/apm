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

/**
 * Location and information about a chunk mark in the APM database
 *
 * @package APM\FullTranscription
 */
class ApmChunkMarkLocation extends ApmItemLocation
{
    /**
     * @var string
     */
    public $workId;

    /**
     * @var int
     */
    public $chunkNumber;

    /**
     * @var int
     */
    public $segmentNumber;

    /**
     * @var int
     */
    public $docId;
    /**
     * @var string
     */
    public $type;
    /**
     * @var string
     */
    public $witnessLocalId;
    /**
     * @var string
     */
    public $validFrom;
    /**
     * @var string
     */
    public $validUntil;


    public function __construct()
    {
        parent::__construct();
        $this->workId = '';
        $this->chunkNumber = 0;
        $this->witnessLocalId = 'A';
        $this->segmentNumber = 0;
        $this->docId = 0;
        $this->type = '';
        $this->validFrom = '';
        $this->validUntil = '';

    }

}