<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

namespace APM\System;

/**
 * Unified structure containing information about a witness in the system
 *
 * @package APM\System
 */
class WitnessInfo
{
   /**
     * @var string
     */
    public $type;
    /**
     * @var string
     */
    public $workId;
    /**
     * @var int
     */
    public $chunkNumber;
    /**
     * @var string
     */
    public $languageCode;
    /**
     * @var string
     */
    public $systemId;
    /**
     * @var bool
     */
    public $isValid;

    public $typeSpecificInfo;
    /**
     * @var int
     */
    public $errorCode;

    public function __construct()
    {
        $this->type = '';
        $this->workId = '';
        $this->chunkNumber = 0;
        $this->languageCode = '';
        $this->systemId = '';
        $this->isValid = false;
        $this->typeSpecificInfo = null;
        $this->errorCode = 0;
    }

}