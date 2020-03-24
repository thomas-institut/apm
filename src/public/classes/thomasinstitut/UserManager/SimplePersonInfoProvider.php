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

namespace ThomasInstitut\UserManager;


/**
 * Class SimplePersonInfoProvider
 *
 * A PersonInfoProvider that just converts the given id to a simple string
 *
 * @package ThomasInstitut\UserManager
 */
class SimplePersonInfoProvider implements PersonInfoProvider
{

    const DEFAULT_PREFIX = 'Person ';
    /**
     * @var string
     */
    private $prefix;
    /**
     * @var string
     */
    private $prefixInitial;

    public function __construct(string $prefix = self::DEFAULT_PREFIX)
    {
        $this->prefix = $prefix;
        if ($this->prefix === '') {
            $this->prefixInitial = '';
        } else {
            $this->prefixInitial = substr($this->prefix, 0, 1);
        }
    }

    public function getFullNameFromId(int $id): string
    {
       return  $this->prefix  . $id;
    }

    public function getShortNameFromId(int $id): string
    {
        return $this->prefixInitial . $id;
    }
}