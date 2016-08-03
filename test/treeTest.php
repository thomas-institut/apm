<?php

require_once 'tree.php';

 class car{

            public $colorId;
            
            function __construct(){
                $this->colorId = rand();
            }
        }

        class jeep extends car{
            public $secondColorId;

            function __construct(){
                parent::__construct();
                $this->secondColorId = rand();
            }
        }



class treeTest extends PHPUnit_Framework_TestCase{

    public function testConstruct() {

        $t = new tree();

        $this->assertEquals(count($t->nodes), 0);
        $this->assertEquals(count($t->children), 0);
        $this->assertEquals($t->lastId, 0);

        return $t;
    }

    /**
     * @depends testConstruct
     */
    public function testAddAtRoot($t){

        // non existent parent
        $id = $t->addNode('string', 10);
        $this->assertEquals(false, $id);

        // normal add
        $id = $t->addNode('string', 0);

        $this->assertEquals($id, 1);
        $this->assertEquals($t->lastId, 1);
        $this->assertEquals($t->nodes[1]['p'], 0);
        $this->assertEquals($t->nodes[1]['d'], 'string');
        $this->assertEquals(count($t->nodes), 1);
        $this->assertEquals(count($t->children[0]), 1);
        $this->assertEquals($t->children[0][0], 1);

        return $t;
    }

     public function testAddAtRoot2(){
         $t = new tree();
         $id = $t->addNode('string', 0, 0);

        $this->assertEquals($id, 1);
        $this->assertEquals($t->lastId, 1);
        $this->assertEquals($t->nodes[1]['p'], 0);
        $this->assertEquals($t->nodes[1]['d'], 'string');
        $this->assertEquals(count($t->nodes), 1);
        $this->assertEquals(count($t->children[0]), 1);
        $this->assertEquals($t->children[0][0], 1);

        return $t;
    }

    /**
     * @depends testAddAtRoot
     */
    public function testDeleteAtRoot($t){
        $t->deleteNode(1);

        $this->assertEquals(count($t->nodes), 0);
        $this->assertEquals(isset($t->children[0]), false);
        $this->assertEquals(count($t->children), 0);
    }

    public function testDeleteChildren(){
        $t = new tree();

        $t->addNode('p1', 0, 1);
        $t->addNode('p2', 0, 2);
        $t->addNode('c1', 1, 11);
        $t->addNode('c2', 1, 12);
        $t->addNode('c3', 1, 13);
        $t->addNode('c4', 2, 21);

        $this->assertEquals(count($t->nodes), 6);
        $this->assertEquals(isset($t->children[0]), true);
        $this->assertEquals(isset($t->children[1]), true);
        $this->assertEquals(isset($t->children[2]), true);
        $this->assertEquals(count($t->children[0]), 2);
        $this->assertEquals(count($t->children[1]), 3);
        $this->assertEquals(count($t->children[2]), 1);

        $r = $t->deleteNode(12);
        $this->assertEquals($r, true);
        $this->assertEquals(count($t->nodes), 5);
        $this->assertEquals(isset($t->children[0]), true);
        $this->assertEquals(isset($t->children[1]), true);
        $this->assertEquals(isset($t->children[2]), true);
        $this->assertEquals(count($t->children[0]), 2);
        $this->assertEquals(count($t->children[1]), 2);
        $this->assertEquals(count($t->children[2]), 1);

        $r = $t->deleteNode(2);
        $this->assertEquals($r, false);
        $this->assertEquals(count($t->nodes), 5);
        $this->assertEquals(isset($t->children[0]), true);
        $this->assertEquals(isset($t->children[1]), true);
        $this->assertEquals(isset($t->children[2]), true);
        $this->assertEquals(count($t->children[0]), 2);
        $this->assertEquals(count($t->children[1]), 2);
        $this->assertEquals(count($t->children[2]), 1);
        
        $r = $t->deleteNode(2, true);
        $this->assertEquals($r, true);
        $this->assertEquals(count($t->nodes), 3);
        $this->assertEquals(isset($t->children[0]), true);
        $this->assertEquals(isset($t->children[1]), true);
        $this->assertEquals(isset($t->children[2]), false);
        $this->assertEquals(count($t->children[0]), 1);
        $this->assertEquals(count($t->children[1]), 2);
  
    }

    public function testUpdateNode(){

        $t = new tree();

        $t->addNode('some string', 0, 1);
        $t->addNode('some other string', 0, 2);
        $this->assertFalse($t->getNode(10));
        $this->assertEquals('some other string', $t->getNode(2));
        $t->updateNode(2, 'new string');
        $this->assertEquals('new string', $t->getNode(2));
              
    }

    public function testChangeParent(){
        $t = new tree();

        $t->addNode('some string', 0, 1);
        $t->addNode('some string', 0, 2);
        $t->addNode('some string', 0, 3);
        $t->addNode('some string', 2, 4);
        $t->addNode('some string', 2, 5);

        $r = $t->changeParent(0, 2);
        $this->assertFalse($r);

        $r = $t->changeParent(10, 2);
        $this->assertFalse($r);

        $r = $t->changeParent(4, 0);
        $this->assertTrue($r);
        $this->assertEquals(0, $t->getParent(4));
        
        $this->assertTrue($t->hasChildren(2));
        $this->assertEquals(1, count($t->getChildren(2)));
        $this->assertFalse($t->hasChildren(3));
        $t->changeParent(4, 3);
        $this->assertTrue($t->hasChildren(3));
        $this->assertEquals(1, count($t->getChildren(2)));
        $this->assertEquals(1, count($t->getChildren(3)));
        $t->changeParent(5, 3);
        $this->assertFalse($t->hasChildren(2));
        $this->assertEquals(2, count($t->getChildren(3)));

        // Once again!
        $t->changeParent(5, 3);
        $this->assertFalse($t->hasChildren(2));
        $this->assertEquals(2, count($t->getChildren(3)));
                
    }

    public function testTreeWithObjects(){

       
        $t = new tree();
        $t->addNode(new car(), 0, 1);
        $t->addNode(new car(), 0, 2);
        $t->addNode(new jeep(), 1, 3);
        $t->addnode(new jeep(), 1, 4);

        $c = $t->getNode(2);
        
        $this->assertTrue(is_object($c));
        $this->assertTrue(isset($c->colorId));
        $this->assertFalse(isset($c->secondColorId));

    }
}

?>