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

namespace ThomasInstitut\Profiler;

class CounterTracker implements PropertyTracker, Counter
{

    /**
     * @var int
     */
    private int $theInt;
    /**
     * @var int
     */
    private int $initialValue;

    public function __construct(int $initialValue = 0)
    {

        $this->reset($initialValue);
    }
    
    

    /**
     * @inheritDoc
     */
    public function start(): int
    {
        $this->reset($this->initialValue);
        return $this->initialValue;
    }

    /**
     * @inheritDoc
     */
    public function end(): int
    {
        return $this->getValue();
    }

    /**
     * @inheritDoc
     */
    public function lap(): int
    {
        return $this->getValue();
    }

    /**
     * @inheritDoc
     */
    public function difference($value1, $value2): int
    {
        return (int) $value1 - (int) $value2;
    }

    /**
     * @inheritDoc
     */
    public function increment(): int
    {
        $this->theInt++;
        return $this->theInt;
    }

    /**
     * @inheritDoc
     */
    public function add($value): int
    {
        $this->theInt += $value;
        return $this->theInt;
    }

    public function reset(int $initialValue)
    {
        $this->initialValue = $initialValue;
        $this->theInt = $initialValue;
    }

    public function getValue() : int
    {
        return $this->theInt;
    }

    public function getInitialValue() : int
    {
        return $this->initialValue;
    }
}