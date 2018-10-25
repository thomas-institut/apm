<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM;
require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use APM\Storage\ObjectStore;
/**
 * Description of testObjectStore
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */



class StringObject {
    public $theStr;
    
    public function __construct($s) {
        $this->theStr = $s;
    }
    
}
class ObjectStoreTest extends TestCase {
    
    const NUM_NEW_OBJECTS = 100;
    
    const NUM_RANDOM_UPDATES = 50;
    
    
    
    public function testStore()
    {
        $os = new ObjectStore();
        
        $this->assertEquals(0, $os->count());
        
        for($i = 0; $i < self::NUM_NEW_OBJECTS; $i++) {
            $newObject = new StringObject("Object-" . ($i+1));
            $os->addObject($newObject);
            $this->assertEquals($i+1, $os->count());
        }
        
        $numObjects = $os->count();
        for ($i=0; $i < self::NUM_RANDOM_UPDATES; $i++) {
            $id = random_int(0, $numObjects-1);
            $obj = $os->getObject($id);
            $this->assertNotFalse($obj);
            $this->assertTrue($os->updateObject($id, new StringObject($obj->theStr . ".mod-" . $i)));
            $modObj = $os->getObject($id);
            $this->assertNotFalse($modObj);
            $this->assertNotSame($obj, $modObj);
        }
    }
    
}
