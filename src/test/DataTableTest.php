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

require_once 'DataTable.php';
require_once 'SimpleProfiler.php';
/**
 * Description of DataTableTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DataTableTest  extends PHPUnit_Framework_TestCase {
    
    var $numRows = 100;
    static $profiler;
    public static function setUpBeforeClass(){
     
        self::$profiler = new AverroesProject\SimpleProfiler;
        self::$profiler->timingPoint("Start");
    }
    
    function testInMemoryDataTableCreation() {
        $dt = new \AverroesProject\InMemoryDataTable();
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
     * @depends testInMemoryDataTableCreation
     */
    function testFind(\AverroesProject\InMemoryDataTable $dt){
        $nSearches = 100;
        for ($i = 0; $i < $nSearches; $i++){
            $someInt = rand(1, $this->numRows);
            $someTextvalue = "textvalue$someInt";
            $testMsg = "Random searches,  iteration $i, int=$someInt";
            $theId = $dt->findRow(['somekey' => $someInt]);
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
     * @depends testInMemoryDataTableCreation
     */
    public function testUpdate(\AverroesProject\InMemoryDataTable $dt){
        $nUpdates = 10;
        for ($i = 0; $i < $nUpdates; $i++){
            $someInt = rand(1, $this->numRows);
            $newTextValue = "NewTextValue$someInt";
            $testMsg = "Random updates,  iteration $i, int=$someInt";
            $theId = $dt->findRow(['somekey' => $someInt]);
            $this->assertNotSame(false, $theId, $testMsg);
            $this->assertNotSame(false, $dt->updateRow(['id'=>$theId, 'someotherkey' => $newTextValue]));
            $theRow = $dt->getRow($theId);
            $this->assertNotSame(false, $theRow);
            $this->assertSame($newTextValue, $theRow['someotherkey']);
            $this->assertSame($someInt, $theRow['somekey']);
        }
    }
     public static function tearDownAfterClass(){
        //print self::$profiler->getReport();
        
    }
}
