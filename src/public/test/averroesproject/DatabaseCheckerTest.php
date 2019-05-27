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

namespace AverroesProject\Data;

require "../vendor/autoload.php";
require '../test/testdbconfig.php';


use PHPUnit\Framework\TestCase;
use \PDO;

/**
 * Description of DatabaseCheckerTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseCheckerTest extends TestCase {
    
    public static $dbConn;

    public static function setUpBeforeClass(){
        global $config;
        
        self::$dbConn = new PDO('mysql:dbname=' . $config['db'] . 
                ';host=' . $config['host'], $config['user'], 
                $config['pwd']);
        
         $tableSetupSQL =<<<EOD
            DROP TABLE IF EXISTS `dbchecktest_settings`;
            DROP TABLE IF EXISTS `dbchecktest_other`;
EOD;
        self::$dbConn->query($tableSetupSQL);
    }
    
    public function testChecker()
    {
        $tables = [ 'settings' => 'dbchecktest_settings',
                    'anotherone' => 'dbchecktest_other'
            ];
        
        $checker = new DatabaseChecker(self::$dbConn, $tables);
        
        $this->assertFalse($checker->isDatabaseInitialized());
        $this->assertFalse($checker->isDatabaseUpToDate());
        $tableSetupSQL =<<<EOD
        CREATE TABLE `dbchecktest_settings` (
          `id` int(11) NOT NULL,
          `setting` varchar(16) NOT NULL,
          `value` varchar(512) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;


EOD;
        self::$dbConn->query($tableSetupSQL);
        $checker = new DatabaseChecker(self::$dbConn, $tables);
        $this->assertFalse($checker->isDatabaseInitialized());
        $this->assertFalse($checker->isDatabaseUpToDate());
        
        $tableSetupSQL = <<<EOD
        INSERT INTO `dbchecktest_settings` (`id`, `setting`, `value`) VALUES
        (1, 'dbversion', '16');
EOD;
        self::$dbConn->query($tableSetupSQL);
        
        $checker = new DatabaseChecker(self::$dbConn, $tables);
        $this->assertFalse($checker->isDatabaseInitialized());
        $this->assertTrue($checker->isDatabaseUpToDate());
        
        $tableSetupSQL =<<<EOD
        CREATE TABLE `dbchecktest_other` (
          `id` int(11) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
EOD;
        self::$dbConn->query($tableSetupSQL);
        $checker = new DatabaseChecker(self::$dbConn, $tables);
        $this->assertTrue($checker->isDatabaseInitialized());
        $this->assertTrue($checker->isDatabaseUpToDate());
    }
    
}
