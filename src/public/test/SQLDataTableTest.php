<?php

/*
 *  Copyright (C) 2016 Universität zu Köln
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

use AverroesProject\DataTable\MySqlDataTable;
use AverroesProject\DataTable\MySqlDataTableWithRandomIds;
use PHPUnit\Framework\TestCase;
use \PDO;
/**
 * Description of SQLDataTableTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SQLDataTableTest extends TestCase {
    protected static $db;
    var $numRows = 100;
    static $profiler;
    
    public static function setUpBeforeClass(){
        self::$db = new PDO('mysql:dbname=test;host=127.0.0.1', 'test', 'j0j0j0');
        self::$db->query('TRUNCATE TABLE testtable');
        self::$profiler = new SimpleProfiler;
        self::$profiler->timingPoint("Start");
    }
    
    public function test1(){
        $dt = new MySqlDataTable(self::$db, 'testtable');
        self::$profiler->timingPoint("Data table setup");
        $this->assertSame(false, $dt->rowExistsById(1));
        
        $ids = array();
        for ($i = 1 ; $i <= $this->numRows; $i++){
            $someRow = [ 'somekey' => $i, 'someotherkey' => "textvalue$i"];
            $testMsg = "Creating rows, iteration $i";
            $newId = $dt->createRow($someRow);
            $this->assertNotEquals(false, $newId, $testMsg);
            $this->assertSame(true, $dt->rowExistsById($newId), $testMsg);
            array_push($ids, $newId);
        }
        
        self::$profiler->timingPoint("Rows created", $this->numRows);
        // Some random deletions and additions
        $nIterations = $this->numRows/10;
        for ($i = 0; $i < $nIterations; $i++){
            $theId = $ids[rand(0, $this->numRows-1)];
            $testMsg = "Random deletions and additions,  iteration $i, id=$theId";
            $this->assertSame(true, $dt->rowExistsById($theId), $testMsg);
            $this->assertSame(true, $dt->deleteRow($theId), $testMsg);
            $this->assertSame(false, $dt->rowExistsById($theId), $testMsg);
            $newId = $dt->createRow([ 'id' => $theId, 'somekey' => $theId,'someotherkey' => "textvalue$theId" ]);
            $this->assertNotEquals(false, $newId, $testMsg );
            $this->assertSame($theId, $newId, $testMsg);
            
        }
        self::$profiler->timingPoint("Random deletions and additions", $nIterations*2);
        return $dt;
    }
    
     /**
     * 
     * @depends test1
     */
    function testEscaping(MySqlDataTable $dt){
        
        // somekey is supposed to be an integer
        $id = $dt->createRow(['somekey' => 'A string']);
        $this->assertSame(false, $id);
        
        // This should work
        $id = $dt->createRow(['somekey' => 120]);
        $this->assertNotSame(false, $id);
        $theRow = $dt->getRow($id);
        $this->assertSame($id, $theRow['id']);
        $this->assertEquals(120, $theRow['somekey']);
        $this->assertSame(NULL, $theRow['someotherkey']);
        $id2 = $dt->updateRow(['id' => $id, 'somekey' => NULL, 'someotherkey' => 'Some string']);
        $this->assertSame($id, $id2);
        $theRow2 = $dt->getRow($id2);
        $this->assertSame($id2, $theRow2['id']);
        $this->assertEquals(NULL, $theRow2['somekey']);
        $this->assertSame('Some string', $theRow2['someotherkey']);

    }
    
    /**
     * 
     * @depends test1
     */
    function testFind(MySqlDataTable $dt){
        //print_r($dt);
        $nSearches = 100;
        for ($i = 0; $i < $nSearches; $i++){
            $someInt = rand(1, $this->numRows);
            $someTextvalue = "textvalue$someInt";
            $testMsg = "Random searches,  iteration $i, int=$someInt";
            $theId = $dt->getIdForKeyValue('somekey', $someInt);
            $this->assertNotSame(false, $theId, $testMsg);
            $theId2 = $dt->findRow(['someotherkey' => $someTextvalue]);
            $this->assertNotSame(false, $theId2, $testMsg);
            $this->assertEquals($theId, $theId2, $testMsg);
            $theId3 = $dt->findRow(['somekey' => $someInt, 'someotherkey' => $someTextvalue]);
            $this->assertNotSame(false, $theId3, $testMsg);
            $this->assertEquals($theId, $theId3, $testMsg);
        }
        
        self::$profiler->timingPoint("Random searches", $nSearches*3);
        
    }
    
     /**
     * 
     * @depends test1
     */
    function testFindDuplicates(MySqlDataTable $dt){
        $someString = 'This string should not be in any row';
        
        $nDuplicates = 10;
        $ids = array();
        for ($i = 0; $i < $nDuplicates; $i++){
            $id =$dt->createRow(['someotherkey' => $someString]);
            $this->assertNotSame(false, $id);
            array_push($ids, $id);
        }
        
        $foundIds = $dt->findRows(['someotherkey' => $someString]);
        $this->assertEquals(count($ids), count($foundIds));
        foreach ($foundIds as $foundId){
            $this->assertNotSame(false, array_search($foundId, $ids));
        }
        
        $singleId = $dt->findRow(['someotherkey' => $someString]);
        $this->assertNotSame(false, $singleId);
        $this->assertNotSame(false, array_search($singleId, $ids));
        
    }
 
    /**
     * `
     * @depends test1
     */
    public function testUpdate(MySqlDataTable $dt){
        $nUpdates = 100;
        for ($i = 0; $i < $nUpdates; $i++){
            $someInt = rand(1, $this->numRows);
            $newTextValue = "NewTextValue$someInt";
            $theId = $dt->findRow(['somekey' => $someInt]);
            // Can't assume that the randon int will be found in the data
            if ($theId === false){
                continue;
            }
            $testMsg = "Random updates,  iteration $i, int=$someInt, id=$theId";
            $this->assertNotSame(false, $theId, $testMsg);
            $this->assertNotSame(false, $dt->updateRow(['id'=>$theId, 'someotherkey' => $newTextValue]), $testMsg);
            $theRow = $dt->getRow($theId);
            $this->assertNotSame(false, $theRow);
            $this->assertSame($newTextValue, $theRow['someotherkey']);
            $this->assertEquals($someInt,  $theRow['somekey']);
            $someOtherInt = rand(1, 10000);
            $this->assertNotSame(false, $dt->updateRow(['id'=>$theId, 'somekey' => $someOtherInt]), $testMsg);
            $theRow = $dt->getRow($theId);
            $this->assertEquals($someOtherInt,  $theRow['somekey']);
            $this->assertEquals($newTextValue, $theRow['someotherkey']);
            $this->assertSame(false, $dt->updateRow(['id'=>$theId, 'nonexistentkey' => $someOtherInt]), $testMsg);
            
        }
    }
    
    
    
   /**
     * 
     * @depends test1
     */
    function testRandomIds (){
        self::$profiler->timingPoint("Start of testRandom Ids");
        $minId = 100000;
        $maxId = 200000;
        $dt = new MySqlDataTableWithRandomIds(self::$db, 'testtable', $minId, $maxId);
        self::$profiler->timingPoint("Data table setup");
        
        // Adding new rows
        $nRows = 10;
        for ($i = 0; $i < $nRows; $i++){
            $newID = $dt->createRow([ 'somekey' => $i, 'someotherkey' => "textvalue$i"] );
            $this->assertGreaterThanOrEqual($minId, $newID);
            $this->assertLessThanOrEqual($maxId, $newID);
        }
        self::$profiler->timingPoint("Rows with random Ids added", $nRows);
        
        // Trying to add rows with random Ids, but the Ids are all already taken,
        // new IDs should be greater than the rows constructed in the first test.
        $nRows = 10;
        $dt2 = new MySqlDataTableWithRandomIds(self::$db, 'testtable', 1, $this->numRows);
        for ($i = 0; $i < $nRows; $i++){
            $newID = $dt2->createRow([ 'somekey' => $i, 'someotherkey' => "textvalue$i"] );
            $this->assertNotSame(false, $newID);
            $this->assertGreaterThan($this->numRows, $newID);
        }
        self::$profiler->timingPoint("Rows with random Ids added", $nRows);
    }
    
    public static function tearDownAfterClass(){
        self::$db = null;
        //print self::$profiler->getReport();
        
    }
    
}
