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
use PDO;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\EavDatabase\EavDatabaseTest;
use ThomasInstitut\EavDatabase\SqlEavDatabase;

class SqlEavDatabaseTest extends TestCase
{

    const DB_FILE_NAME = '/tmp/test-eav.sqlite3.db';

    /**
     * @throws Exception
     */
    public function testRunTests() {
        $tester = new EavDatabaseTest("SqlEAV");
        $pdo = new PDO('sqlite:' . self::DB_FILE_NAME);
        $this->setUpDb($pdo);
        $db = new SqlEavDatabase($pdo, 'testtable');
        $tester->runAllTests($db, 'SqlEavDatabase');
    }

    private function setUpDb(PDO $pdo) {
        $pdo->query('DROP TABLE IF EXISTS testtable;');

        $tableSetupSQL =<<<EOD
            CREATE TABLE testtable (
              entity varchar(100),
              attribute varchar(100),
              value varchar(100),
              primary key (entity,attribute)
            );
EOD;

        $pdo->query($tableSetupSQL);
    }

}
