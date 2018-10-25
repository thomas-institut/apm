<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM\Storage;

/**
 * Description of ObjectStore
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ObjectStore {
    private $theObjects;
    
    /**
     *
     * @var int
     */
    private $currentMaxId;
    
    public function __construct() {
        $this->currentMaxId = -1;
        $this->theObjects = [];
    }
    
    private function objectExists($id) : bool {
        return isset($this->theObjects[$id]);
    }
    
    public function addObject($obj) : int {
        $this->currentMaxId++; 
        $this->theObjects[$this->currentMaxId] = $obj; 
        return $this->currentMaxId; 
    }
    
    public function deleteObject(int $id) {
        if ($this->objectExists($id)) {
            unset($this->theObjects[$id]);
        }
    }
    
    public function getObject(int $id) {
        if ($this->objectExists($id)) {
            return $this->theObjects[$id];
        }
        return false;
    }
    
    public function updateObject(int $id, $modifiedObject) : bool {
        if ($this->objectExists($id)) {
            $this->theObjects[$id] = $modifiedObject;
            return true;
        }
        return false;
    }
    
    public function count() {
        return count($this->theObjects);
    }
}
