<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */
namespace AverroesProject;
require "../vendor/autoload.php";
require 'testdbconfig.php';

use PHPUnit\Framework\TestCase;
use AverroesProject\Data\DataManager;
use DataTable\MySqlDataTable;
use DataTable\MySqlDataTableWithRandomIds;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

/**
 * Description of testApi
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class testDataManager extends TestCase {
    
    /**
     *     
     * @var Data\DataManager
     */
    static $dataManager;
    
    public static function setUpBeforeClass() {
        global $config;

        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('DM-TEST');
        $logger->pushHandler($logStream);
        
        $dbConnection = self::getPdo();
        
        self::$dataManager = new DataManager($dbConnection, 
                $config['tables'], 
                $logger);
    }
    
    private function resetTestDataSet()
    {
        $dbConn = self::getPdo();
        
        // Can't TRUNCATE because of foreign keys
        $query = <<<EOD
                DELETE FROM ap_ednotes;
                DELETE FROM ap_items;
                DELETE FROM ap_elements;
                DELETE FROM ap_pages;
                DELETE FROM ap_docs;
EOD;
        $dbConn->query($query);
        
    }
    
    private static function getPdo()
    {
        global $config;
        
        $pdo = new \PDO('mysql:dbname=' . $config['db'] .
                ';host=' . $config['host'], $config['user'], $config['pwd']);
        $pdo->query("set character set 'utf8'");
        $pdo->query("set names 'utf8'");
        return $pdo;
    }
    
    public function testNewDoc()
    {
        $dm = self::$dataManager;
        $this->resetTestDataSet();
        
        // No docs at this point
        $this->assertEquals(0, $dm->getPageCountByDocId(100));
        $this->assertFalse($dm->getPageInfo(100, 200));
        $this->assertEquals(0, $dm->getLineCountByDoc(100));
        $this->assertEquals([], $dm->getEditorsByDocId(100));
        $this->assertEquals([], $dm->getPageListByDocId(100));
        $this->assertFalse($dm->getImageUrlByDocId(100, 200));
        $this->assertEquals([], $dm->getDocIdList('title'));
        
        
        $newDocId = $dm->newDoc('Document 1', 'Doc 1', 10, 'la', 
                'mss', 'local', 'DOC1');
        
        $this->assertNotFalse($newDocId);
        $this->assertEquals(10, $dm->getPageCountByDocId($newDocId));
        $pageInfo = $dm->getPageInfo($newDocId, 10);
        $this->assertNotFalse($pageInfo);
        $this->assertEquals(0, $pageInfo['num_cols']);
        $this->assertEquals('la', $pageInfo['lang']);
        $this->assertNull($pageInfo['foliation']);
        return $newDocId;
    }
    
    /**
     * @depends testNewDoc
     */
    public function testColumns($docId)
    {
        $dm = self::$dataManager;
        $nCols = $dm->getNumColumns($docId, 1);
        $this->assertEquals(0, $nCols);
        
        $this->assertNotFalse($dm->addNewColumn($docId, 1));
        $this->assertEquals(1, $dm->getNumColumns($docId, 1));
        $this->assertNotFalse($dm->addNewColumn($docId, 1));
        $this->assertEquals(2, $dm->getNumColumns($docId, 1));
    }
    
}
