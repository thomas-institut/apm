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

namespace Test\ThomasInstitut\EavDatabase;



use Exception;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataTable\InMemoryDataTable;
use ThomasInstitut\EavDatabase\DataTableEavDatabase;
use ThomasInstitut\EavDatabase\EavDatabaseTest;

class DataTableEavDatabaseTest extends TestCase
{

    /**
     * @throws Exception
     */
    public function testRunTests() {
        $tester = new EavDatabaseTest();
        $database = new DataTableEavDatabase(new InMemoryDataTable(), [ 'e', 'a', 'v']);
        $tester->runAllTests($database, 'DataTableEavDatabase');
    }

    /**
     * @throws InvalidArgumentException
     * @throws Exception
     */
    public function testRunTestsWithoutCache() {
        $tester = new EavDatabaseTest("WithoutCache");
        $database = new DataTableEavDatabase(new InMemoryDataTable());
        $database->doNotUseCache();
        $tester->runAllTests($database, 'DataTableEavDatabase');
    }

    public function testConstructor() {

        $exceptionCaught = false;
        try {
            new DataTableEavDatabase(new InMemoryDataTable(), ['a']);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        $exceptionCaught = false;
        try {
            new DataTableEavDatabase(new InMemoryDataTable(), [1, 2, 3]);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        $exceptionCaught = false;
        try {
            new DataTableEavDatabase(new InMemoryDataTable(), ['a', '', 'b']);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

    }

}