<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\Data;

require "../vendor/autoload.php";
require 'testdbconfig.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\TestHandler;
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
        (1, 'dbversion', '8');
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
