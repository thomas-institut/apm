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
    public string $type;
    /**
     * @var string
     */
    public string $workId;
    /**
     * @var int
     */
    public int $chunkNumber;

    /**
     * The witness language, an entity Id
     * @var int
     */
    public int $language;
    /**
     * @var string
     * @deprecated use language
     */
    public string $languageCode;
    /**
     * @var string
     */
    public string $systemId;
    /**
     * @var bool
     */
    public bool $isValid;

    public ?array $typeSpecificInfo;
    /**
     * @var int
     */
    public int $errorCode;

    public function __construct()
    {
        $this->type = '';
        $this->workId = '';
        $this->chunkNumber = 0;
        $this->languageCode = '';
        $this->language = -1;
        $this->systemId = '';
        $this->isValid = false;
        $this->typeSpecificInfo = null;
        $this->errorCode = 0;
    }

}