<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace APM\StandardData;


use APM\Core\Witness\Witness;

class WitnessDataProvider implements StandardDataProvider
{

    /**
     * @var Witness
     */
    private $witness;

    public function __construct(Witness $w)
    {
        $this->witness = $w;
    }

    /**
     * @inheritDoc
     */
    public function getStandardData()
    {
        return (object) [
            'workId' => $this->witness->getWorkId(),
            'chunk' => $this->witness->getChunk(),
            'localWitnessId' => $this->witness->getLocalWitnessId(),
            'chunkId' => $this->witness->getWorkId() . '-' . $this->witness->getChunk(),
            'lang' => $this->witness->getLang()
        ];
    }
}