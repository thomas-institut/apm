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

namespace ThomasInstitut\Container;


use Psr\Container\ContainerInterface;

/**
 * Class MinimalContainer
 * A minimalistic, no-frills container that only stores static values
 * @package ThomasInstitut\Container
 */
class MinimalContainer implements ContainerInterface
{

    /**
     * @var array
     */
    private $theArray;

    public function __construct()
    {
        $this->theArray = [];
    }

    /**
     * @inheritDoc
     */
    public function get($id)
    {
        if ($this->has($id)) {
            return $this->theArray[$id];
        }
        throw new NotFoundException();
    }

    /**
     * @inheritDoc
     */
    public function has($id)
    {
        return isset($this->theArray[$id]);
    }

    public function set(string $id, $value) : void
    {
        $this->theArray[$id] = $value;
    }
}