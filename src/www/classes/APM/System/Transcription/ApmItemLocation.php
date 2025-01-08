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

namespace APM\System\Transcription;


use InvalidArgumentException;

/**
 * The full location of a transcription item in the APM database:
 *   doc_id, page sequence, column number, element sequence, item sequence
 *
 *
 */
class ApmItemLocation
{
    /**
     * @var int
     */
    public int $docId;

    /**
     * @var int
     */
    public int $pageSequence;

    /**
     * @var int
     */
    public int $columnNumber;

    /**
     * @var int
     */
    public int $elementSequence;

    /**
     * @var int
     */
    public int $itemSequence;
    /**
     * @var int
     */
    public int $pageId;


    public function __construct()
    {
        $this->docId = 0;
        $this->pageSequence = 0;
        $this->pageId = 0;
        $this->columnNumber = 0;
        $this->elementSequence = 0;
        $this->itemSequence = 0;
    }

    /**
     * Returns a single integer representing the location relative to the document.
     *
     * This number can be used to determine the relative position of a location with respect
     * to another
     *
     * @return int
     */
    public function getIntLocation() : int {
        return $this->pageSequence * 100000000 +
            $this->columnNumber * 1000000 +
            $this->elementSequence * 1000 +
            $this->itemSequence;
    }

    /**
     * Returns true if the item location is after the given location
     * @param ApmItemLocation $loc2
     * @return bool
     */
    public function isAfter(ApmItemLocation $loc2): bool
    {
        if ($this->docId !== $loc2->docId) {
            throw new InvalidArgumentException("Cannot determine order of locations in different documents");
        }
        return $this->getIntLocation() > $loc2->getIntLocation();
    }

    /**
     * Returns true if none of the location's values have been set
     * @return bool
     */
    public function hasNotBeenSet() : bool {
        return $this->getIntLocation() === 0;
    }

}