<?php

require_once 'dbtree.php';



class dbTreeTest extends PHPUnit_Framework_TestCase{


    public function testDBSetup(){

        $testDb = new mysqli();

        $r = $testDb->real_connect('localhost', 'test', 'JssGdr29yU6G2tFM', 'test_rm');
        $this->assertEquals(true, $r, $testDb->error);

        $driver = new mysqli_driver();
        $driver->report_mode = MYSQLI_REPORT_STRICT;

        

        $testDb->query('drop table if exists `treetest_data`');
        $r = $testDb->query('create table `treetest_data` (`id` int unique, `field1` varchar(40))');
        $this->assertEquals(true, $r, $testDb->error);
        $r = $testDb->query('drop table if exists `treetest_trees`');
        $this->assertEquals(true, $r, $testDb->error);
        $r = $testDb->query('create table `treetest_trees` (`tree` int, `id` int, `parent` int)');
        $this->assertEquals(true, $r, $testDb->error);
        $testDb->query('drop table if exists `treetest_single`');
        $r = $testDb->query('create table `treetest_single` (`id` int unique, `parent` int, `field1` varchar(40))');
        $this->assertEquals(true, $r, $testDb->error);

        return $testDb;
        
    }

    public function resetTestTables($db){
        $db->query('truncate treetest_trees');
        $db->query('truncate treetest_data');
        $db->query('truncate treetest_single');
    }

    public function testBuildInsertQuery(){

        $a = array(1, 'string', 3);

        $this->assertEquals(false, dbTree::buildInsertQuery('x', $a));

        $a = array( 'field1' => 1, 'field2'=> 'a string');

        $q = dbTree::buildInsertQuery('someTable', $a);
        $this->assertEquals(true, is_string($q));
        $this->assertEquals("insert into `someTable` (`field1`, `field2`) values (1, 'a string')", $q);
        
    }

     public function testBuildUpdateQuery(){

        $a = array(1, 'string', 3);

        $this->assertEquals(false, dbTree::buildUpdateQuery('x', 1, $a, 'id'));

        $a = array( 'field1' => 1, 'field2'=> 'a string');

        $q = dbTree::buildUpdateQuery('someTable', 20,  $a, 'id');
        $this->assertEquals(true, is_string($q));
        $this->assertEquals("update `someTable` set `field1`=1, `field2`='a string' where `id`=20", $q);
        
    }

    /**
     * @depends testDBSetup
     */
    public function testSaveNewNode($db){

        $this->resetTestTables($db);
        
        $t = new dbTree();
        $t->assignDb($db, 'treetest_data', 'treetest_trees', 25);
        $r = $t->saveNewNode(array('field1'=>'testNode1'), 0, 1);
        $this->assertEquals (1, $r);
        $r  = $db->query('select * from treetest_data');
      
        $d = $r->fetch_assoc();
        $this->assertEquals (1, $r->num_rows);
        $this->assertEquals (1, $d['id']);
        $this->assertEquals ('testNode1', $d['field1']);

        $r = $db->query('select * from treetest_trees');
        $this->assertEquals(1, $r->num_rows);
        $d = $r->fetch_assoc();
        $this->assertEquals(25, $d['tree']);
        $this->assertEquals(1, $d['id']);
        $this->assertEquals(0, $d['parent']);
    }

     /**
     * @depends testDBSetup
     */
    public function testSaveNewNode2($db){

        $this->resetTestTables($db);
        
        $t = new dbTree();
        $t->assignDb($db, 'treetest_single');
        $r = $t->saveNewNode(array('field1'=>'testNode1'), 0, 1);
        $this->assertEquals (1, $r);
        $r  = $db->query('select * from treetest_single');
      
        $d = $r->fetch_assoc();
        $this->assertEquals (1, $r->num_rows);
        $this->assertEquals (1, $d['id']);
        $this->assertEquals ('testNode1', $d['field1']);
        $this->assertEquals(0, $d['parent']);
  
    }

    /**
     * @depends testDBSetup
     */
    public function testDeleteNodeEntry($db){
        $this->resetTestTables($db);
        $t = new dbTree();
        $t->assignDb($db, 'treetest_single');
        $t->saveNewNode(array('field1'=>'testNode1'), 0, 1);
        $t->deleteNodeEntry(1);
        $r  = $db->query('select * from treetest_single');
        $this->assertEquals(0, $r->num_rows);
        return $db;
    }

   
    /**
     * @depends testDeleteNodeEntry
     */
    public function testAddDeleteNodes($db){
        $this->resetTestTables($db);
       
        // A totally random tree of 100 elements
        $data = array();
        $parents = array();

        for($i = 1; $i<=100; $i++){
            $data[$i]['field1'] = rand();
            $parents[$i] = rand(0, $i -1);
        }


        // Add nodes to single table tree
        $t = new dbTree();
        $t->assignDb($db, 'treetest_single');
        for($i = 1; $i<=100; $i++){
            $nId = $t->addNode($data[$i], $parents[$i], $i);
        }
        $this->assertEquals(100, count($t->nodes));
        $this->assertEquals(100, $t->lastId);
        $r  = $db->query('select * from treetest_single');
        $this->assertEquals(100, $r->num_rows);

        // Add nodes to two table tree
        $t2 = new dbTree();
        $t2->assignDb($db, 'treetest_data', 'treetest_trees', 10);
         for($i = 1; $i<=100; $i++){
            $nId = $t2->addNode($data[$i], $parents[$i], $i);
        }
        $this->assertEquals(100, count($t2->nodes));
        $this->assertEquals(100, $t2->lastId);
        $r  = $db->query('select * from treetest_data');
        $this->assertEquals(100, $r->num_rows);
        $r = $db->query('select * from treetest_trees');
        $this->assertEquals(100, $r->num_rows);

        $this->assertEquals($t->nodes, $t2->nodes);
        $this->assertEquals($t->children, $t2->children);

        // Test some updates

        $randomNumber = rand();
        $randomId = rand(1,100);
        $newNodeData = array('field1'=>$randomNumber);
        $t->updateNode($randomId, $newNodeData);
        $t2->updateNode($randomId, $newNodeData);
        $this->assertEquals($randomNumber, $t->getNode($randomId)['field1']);
        $this->assertEquals($randomNumber, $t2->getNode($randomId)['field1']);
        $r  = $db->query('select * from treetest_single where `id`=' . $randomId);
        $this->assertEquals(1, $r->num_rows);
        $row = $r->fetch_assoc();
        $this->assertEquals($randomNumber, $row['field1']);
        $r  = $db->query('select * from treetest_data where `id`=' . $randomId);
        $this->assertEquals(1, $r->num_rows);
        $row = $r->fetch_assoc();
        $this->assertEquals($randomNumber, $row['field1']);
 
      

        // Try to delete 30 random nodes
        $deleted = 0;
        for ($i=0; $i<30; $i++){
            $id = rand(1,100);
            $r = $t->deleteNode($id, false);
            $r2 = $t2->deleteNode($id, false);
            $this->assertEquals($r, $r2);
            if($r){
                $deleted++;
            }
        }
        $this->assertEquals(100-$deleted, count($t->nodes));
        $this->assertEquals(100-$deleted, count($t2->nodes));
        $this->assertEquals($t->nodes, $t2->nodes);
        $this->assertEquals($t->children, $t2->children);

        $r  = $db->query('select * from treetest_single');
        $this->assertEquals(100-$deleted, $r->num_rows);
        $r  = $db->query('select * from treetest_data');
        $this->assertEquals(100-$deleted, $r->num_rows);
        $r = $db->query('select * from treetest_trees');
        $this->assertEquals(100-$deleted, $r->num_rows);

        // Test load from DB as well
        $t3 = new dbTree();
        $t3->assignDb($db, 'treetest_single');
        $t3->loadFromDatabase();
        $this->assertEquals($t->nodes, $t3->nodes);
        // The children arrays do not need to be equal
        // but they need to have the same ids in them
        //$this->assertEquals($t->children, $t3->children);
        
        // Now check with a two table tree and reusing
        // a tree variable
        $t3->assignDb($db, 'treetest_data', 'treetest_trees', 10);
        $t3->loadFromDatabase();
        $this->assertEquals($t->nodes, $t3->nodes);
        
        return $db;
    }

    /**
     * @depends testDBSetup
     */
    public function testLoadFromDatabase($db){

        $t = new dbTree();
        $t->assignDb($db, 'treetest_single');
        $this->resetTestTables($db);
        $t->loadFromDatabase();
        $this->assertEquals(0, count($t->nodes));
        $this->assertEquals(0, count($t->children));
    }

    /**
     * @depends testDBSetup
     */
    public function testChangeParent($db){
        $this->resetTestTables($db);
        $t = new dbTree();
        $t->assignDb($db, 'treetest_single');
        $t2 = new dbTree();
        $t2->assignDb($db, 'treetest_data', 'treetest_trees', 10);

        $t->addNode(array('field1'=>'some string'), 0, 1);
        $t->addNode(array('field1'=>'some string'), 0, 2);
        $t->addNode(array('field1'=>'some string'), 2, 3);
        $t->addNode(array('field1'=>'some string'), 2, 4);

        $r = $db->query('select * from treetest_single where id=3');
        $row = $r->fetch_assoc();
        $node3 = array('id' => 3, 'parent' => 2, 'field1'=>'some string');
        $this->assertEquals($node3, $row);

        $t->changeParent(3, 0);
        $r = $db->query('select * from treetest_single where id=3');
        $row = $r->fetch_assoc();
        $node3 = array('id' => 3, 'parent' => 0, 'field1'=>'some string');
        $this->assertEquals($node3, $row);

        $t2->addNode(array('field1'=>'some string'), 0, 1);
        $t2->addNode(array('field1'=>'some string'), 0, 2);
        $t2->addNode(array('field1'=>'some string'), 2, 3);
        $t2->addNode(array('field1'=>'some string'), 2, 4);

        $r = $db->query('select * from treetest_trees where id=3');
        $row = $r->fetch_assoc();
        $node3 = array('id' => 3, 'tree'=>10, 'parent' => 2);
        $this->assertEquals($node3, $row);

        $t2->changeParent(3, 0);
        $r = $db->query('select * from treetest_trees where id=3');
        $row = $r->fetch_assoc();
        $node3 = array('id' => 3, 'tree'=>10, 'parent' => 0);
        $this->assertEquals($node3, $row);
        
 
    }
   
}