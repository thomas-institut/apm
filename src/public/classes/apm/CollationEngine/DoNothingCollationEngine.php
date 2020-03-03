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

namespace APM\CollationEngine;

/**
 * A collation engine that only copies the witnesses tokens without trying to match them
 * @package APM\CollationEngine
 */
class DoNothingCollationEngine extends CollationEngine
{

    public function __construct()
    {
        parent::__construct('DoNothing Engine 1.0');
    }

    /**
     * @inheritDoc
     */
    public function collate(array $witnessArray): array
    {
        // just create one big segment with copies of the
        // witness tokens
        $this->startChrono();
        $output = [];
        $bigSegment = [];

        foreach($witnessArray as $witness) {
            $output['witnesses'][] = $witness['id'];
            $bigSegment[] = $witness['tokens'];
        }
        $output['table'] = [$bigSegment];
        $this->endChrono();

        return $output;
    }
}