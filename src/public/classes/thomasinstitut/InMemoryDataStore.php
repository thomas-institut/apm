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

namespace ThomasInstitut;


use InvalidArgumentException;
use RuntimeException;

/**
 * Class InMemoryDataStore
 * A DataStore implemented with PHP arrays
 *
 * @package ThomasInstitut
 */
class InMemoryDataStore implements iDataStore
{

    /**
     * @var
     */
    private $data;

    public function __construct()
    {
        $this->data = [];
    }

    /**
     * @inheritDoc
     */
    public function getValue(string $key)
    {
      if ($this->valueExists($key)) {
          return $this->data[$key];
      }
      return null;
    }

    /**
     * @inheritDoc
     */
    public function getJson(string $key): string
    {
        $json = json_encode($this->getValue($key));
        if ($json === false) {
            throw new RuntimeException("Error encoding Json: " . json_last_error_msg(), json_last_error()); // @codeCoverageIgnore
        }
        return $json;
    }

    /**
     * @inheritDoc
     */
    public function valueExists(string $key): bool
    {
        return array_key_exists($key, $this->data);
    }

    /**
     * @inheritDoc
     */
    public function setValue(string $key, $value): void
    {
        $this->data[$key] = $value;
    }

    /**
     * @inheritDoc
     */
    public function setJson(string $key, string $json): void
    {
        $value = json_decode($json, true);
        if (is_null($value) && json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException('Error decoding Json: ' . json_last_error_msg(), json_last_error());
        }

        $this->setValue($key, $value );
    }

    /**
     * @inheritDoc
     */
    public function addValue(string $key, $value): bool
    {
        if ($this->valueExists($key)) {
            return false;
        }

        $this->setValue($key, $value);
        return true;

    }

    /**
     * @inheritDoc
     */
    public function addJson(string $key, string $json): bool
    {
        if ($this->valueExists($key)) {
            return false;
        }
        $this->setJson($key, $json);
        return true;
    }

    /**
     * @inheritDoc
     */
    public function deleteValue(string $key)
    {
        if ($this->valueExists($key)) {
            unset($this->data[$key]);
        }
    }
}