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

namespace Test\ThomasInstitut\DataCache;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataCache\DataCacheTest;
use ThomasInstitut\DataCache\DataTableDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataTable\InMemoryDataTable;


class DataTableDataCacheTest extends TestCase
{

    /**
     * @throws KeyNotInCacheException
     */
    public function testStandardTests() {

        $tester = new DataCacheTest('DataTable');

        $tester->runAllTests(new DataTableDataCache(new InMemoryDataTable()), 'DataTableDataCache');
    }

}