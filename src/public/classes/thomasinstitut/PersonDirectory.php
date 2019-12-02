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


class PersonDirectory
{

    const KEY_STRING_VALUE = 'stringVal';
    const PROPERTY_FULL_NAME = 'fullName';

    const KEY_LANG = 'lang';
    const KEY_FULL_NAME = 'fullName';

    /**
     * @var iDataStore
     */
    private $dataStore;

    public function __construct(iDataStore $dataStore)
    {
        $this->dataStore = $dataStore;
    }


    private function setStringValueProperty(int $objectId, string $propertyName, string $stringValue) {
        $this->dataStore->setProperty($objectId, $propertyName, [ self::KEY_STRING_VALUE => $stringValue]);
    }

    private function getStringValueProperty(int $objectId, string $propertyName) : string {
        $property = $this->dataStore->getProperty($objectId, $propertyName);
        if (count($property) < 1) {
            return '';
        }
        if (!isset($property[0][self::KEY_STRING_VALUE])) {
            return '';
        }
        return $property[0][self::KEY_STRING_VALUE];
    }


}