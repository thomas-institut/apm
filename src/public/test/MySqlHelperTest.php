<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\Data;

require "../vendor/autoload.php";
require 'SiteMockup/testdbconfig.php';

use PHPUnit\Framework\TestCase;
use Monolog\Logger;
use Monolog\Handler\TestHandler;
use \PDO;
/**
 * Description of MySqlHelperTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class MySqlHelperTest extends TestCase{
    
    protected static $dbConn;
    protected static $logger;
    protected static $handler;
    
    public static function setUpBeforeClass(){
        global $config;
        
        self::$dbConn = new PDO('mysql:dbname=' . $config['db'] . 
                ';host=' . $config['host'], $config['user'], 
                $config['pwd']);
        $tableSetupSQL =<<<EOD
            DROP TABLE IF EXISTS `mysqlhelpertest`;
            CREATE TABLE IF NOT EXISTS `mysqlhelpertest` (
              `id` int(11) UNSIGNED NOT NULL,
              `number` int(11) DEFAULT NULL,
              `text` varchar(100) DEFAULT NULL,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=latin1;
            INSERT INTO `mysqlhelpertest` (`id`, `number`, `text`) VALUES
              (1, 10, 'ten'),
              (2, 20, 'twenty');    
EOD;
        self::$dbConn->query($tableSetupSQL);
        
        self::$handler = new TestHandler();
        self::$logger = new Logger('test');
        self::$logger->pushHandler(self::$handler);
    }
    
    public function testQuery()
    {
        $dbh = new MySqlHelper(self::$dbConn, self::$logger);

        self::$handler->clear();
        $r = $dbh->query("BAD QUERY");
        $this->assertFalse($r);
        $this->assertTrue(self::$handler->hasRecords(Logger::ERROR));
        
        self::$handler->clear();
        $r = $dbh->query("SELECT * FROM inexistentable1232");
        $this->assertFalse($r);
        $this->assertTrue(self::$handler->hasRecords(Logger::ERROR));
        
    }
    
    public function testGetOneRow()
    {
        $dbh = new MySqlHelper(self::$dbConn, self::$logger);
        
        // getOneRow
        self::$handler->clear();
        $r = $dbh->getOneRow('SELECT * FROM mysqlhelpertest WHERE id=1');
        $this->assertNotFalse($r);
        // The query returns a string
        $this->assertSame('1', $r['id']);
        // We can use numbers for non-strict comparison
        $this->assertEquals(['id' => 1, 'number' => 10, 'text' => 'ten'], $r);
        $this->assertFalse(self::$handler->hasRecords(Logger::ERROR));
        
        // Non-existent row
        self::$handler->clear();
        $r = $dbh->getOneRow('SELECT * FROM mysqlhelpertest WHERE id=20');
        $this->assertFalse($r);
        
        // Bad Query
        self::$handler->clear();
        $r = $dbh->getOneRow('SELECT * FOM mysqlhelpertest WHERE id=1');
        $this->assertFalse($r);
        $this->assertTrue(self::$handler->hasRecords(Logger::ERROR));
    }    
        
    public function testGetOneField()
    {
        $dbh = new MySqlHelper(self::$dbConn, self::$logger);
        
        // Good get one field
        self::$handler->clear();
        $r = $dbh->getOneFieldQuery('SELECT * FROM mysqlhelpertest WHERE id=1', 'number');
        $this->assertNotFalse($r);
        $this->assertSame('10', $r);
        $this->assertFalse(self::$handler->hasRecords(Logger::ERROR));
        
        // Inexistent field
        self::$handler->clear();
        $r = $dbh->getOneFieldQuery('SELECT * FROM mysqlhelpertest WHERE id=1', 'badfield');
        $this->assertFalse($r);
        $this->assertTrue(self::$handler->hasRecords(Logger::ERROR));
        
        // Bad Query
        self::$handler->clear();
        $r = $dbh->getOneFieldQuery('SELECT * FOM mysqlhelpertest WHERE id=1', 'badfield');
        $this->assertFalse($r);
        $this->assertTrue(self::$handler->hasRecords(Logger::ERROR));
        
        self::$handler->clear();
        $r = $dbh->getRowById('mysqlhelpertest', 2);
        $this->assertNotFalse($r);
        $this->assertSame('20', $r['number']);
        $this->assertSame('twenty', $r['text']);
        $this->assertFalse(self::$handler->hasRecords(Logger::ERROR));
    }
        
    public function testGetAllRows()
    {
        $dbh = new MySqlHelper(self::$dbConn, self::$logger);
        
        self::$handler->clear();
        $rows = $dbh->getAllRows('SELECT * FROM mysqlhelpertest');
        $this->assertNotFalse($rows);
        $this->assertCount(2, $rows);
        foreach ($rows as $row) {
            $this->assertTrue(isset($row['id']));
            $this->assertTrue(isset($row['number']));
            $this->assertTrue(isset($row['text']));
        }
        $this->assertFalse(self::$handler->hasRecords(Logger::ERROR));
        
        self::$handler->clear();
        $rows = $dbh->getAllRows('SELECT * FROM mysqlhelpertest WHERE id=25');
        $this->assertNotFalse($rows);
        $this->assertCount(0, $rows);
        $this->assertFalse(self::$handler->hasRecords(Logger::ERROR));
        
        // Bad query
        self::$handler->clear();
        $rows = $dbh->getAllRows('SELECT * FRM mysqlhelpertest WHERE id=25');
        $this->assertFalse($rows);
        $this->assertTrue(self::$handler->hasRecords(Logger::ERROR));
    }
    
}
