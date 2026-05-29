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

namespace APM\Core\Witness;


/**
 * Interface WitnessDecorator
 *
 * @package APM\Core\Witness
 */

interface WitnessDecorator
{
    /**
     * Returns an array of decorated tokens
     * Each decorator defines what this decorated token actually is.
     * @param Witness $w
     * @return array
     */
    public function getDecoratedTokens(Witness $w) : array;
}