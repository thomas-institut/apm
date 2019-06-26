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

namespace APM\EditionEngine;

use APM\Engine\Engine;

/**
 * Base class for edition engines
 *
 * An edition engine is a class that can automatically generate a traditional style edition
 * (i.e., main text plus apparatus) out of a collation table.
 */
abstract class EditionEngine extends Engine  {
    /**
     *  Generates an edition (main text + critical apparatus) out of a simplified collation table
     *
     * The input array should have following fields:
     *
     *   - collationTable : an array of arrays of token information:
     *         [ 'siglumA' =>  [  ['tokenType' => TEXT|PUNCT|EMPTY, 'text' => 'sometext, 'apparatusHint'
     *
     * @param array $input
     * @return array
     */
    abstract public function generateEdition(array $input) : array;

}