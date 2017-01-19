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

use \PDO as PDO;

/**
 * An interface to a table made out of rows addressable by a unique key that 
 * behaves mostly like a SQL table. 
 * 
 * It captures common functionality for this kind of table but does 
 * not attempt to impose a particular implementation.  
 * The idea is that one descendant of this class will implement the
 * table as an SQL table, but an implementation with arrays or
 * with something just as simple can be provided for testing.
 * 
 * 
 * By default each row must have a unique int key: 'id' 
 * The assignment of IDs is left to the class, not to the underlying
 * database.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class DataTable {
    
    //
    // PUBLIC METHODS
    //
    
    /**
     * @return bool true if the row with the given Id exists
     */
    abstract public function rowExistsById($rowId);
    
    /**
     * Attempts to create a new row. 
     * If the given row does not have a value for 'id' or if the value
     * is equal to 0 a new id will be assigned.
     * Otherwise, if the given Id is not an int or if the id  
     * already exists in the table the function will return
     * false (updateRow must be used in this latter case)
     * 
     * @return int the Id of the new created row, or false if the row could 
     *             not be created
     */
    public function createRow($theRow){
        if (!isset($theRow['id']) || $theRow['id']===0){
            $theRow['id'] = $this->getOneUnusedId();
            if ($theRow['id'] === false){
                return false;
            }
        }
        else {
            if (!is_int($theRow['id'])){
                return false;
            }
            if ($this->rowExistsById($theRow['id'])){
                return false;
            }
        }
        return $this->realCreateRow($theRow);
    }
    
    /**
     * @return bool true if the row was deleted (or if the row did not 
     *              exist in the first place;
     */
    public function deleteRow($rowId){
        if (!$this->rowExistsById($rowId)){
            return true;
        }
        return $this->realDeleteRow($rowId);
    }
    
    /**
     * Searches the table for a row with the same data as the given row
     * 
     * Only the keys given in $theRow are checked; so, for example,
     * if $theRow is missing a key that exists in the actual rows
     * in the table, those missing keys are ignored and the method
     * will return any row that matches exactly the given keys independently
     * of the missing ones.
     * 
     * @return int the Row Id 
     */
    abstract public function findRow($theRow);
    
    /**
     * Updates the table with the given row, which must contain an 'id'
     * field specifying the row to update
     * 
     * Only the keys given in $theRow are updated; 
     * 
     * @return boolean
     */
    public function updateRow($theRow){
        if (!isset($theRow['id']) || $theRow['id']===0){
            //error_log("Can't update, no id set: " . $theRow['id'] ."\n");
            return false;
        }
        else {
            if (!is_int($theRow['id'])){
                //error_log("Can't update, id is not int: " . $theRow['id'] . " is " . gettype($theRow['id']) . "\n");
                return false;
            }
            if (!$this->rowExistsById($theRow['id'])){
                //error_log("Can't update, row exists: " . $theRow['id'] ."\n");
                return false;
            }
        }
        return $this->realUpdateRow($theRow);
    }
    
    /**
     * Gets the row with the given row Id
     * 
     * @return array The row
     */
    abstract public function getRow($rowId);
    
    /**
     * @return int a unique id that does not exist in the table 
     *             (descendants may want to override the function 
     *             and return false if
     *             a unique id can't be determined (which normally should
     *             not happen!)
     *     
     */
    public function getOneUnusedId(){
        return $this->getMaxId()+1;
    }
    

    //
    // ABSTRACT PROTECTED METHODS
    //
    
    /**
     * @return int the max id in the table
     */
    abstract protected function getMaxId();
    
    abstract protected function getIdForKeyValue($key, $value);
    abstract protected function realCreateRow($theRow);
    abstract protected function realDeleteRow($rowId);
    abstract protected function realUpdateRow($theRow);
 }


 
class InMemoryDataTable extends DataTable {
    
    private $theData = array();
    
    public function rowExistsById($rowId){
        return isset($this->theData[$rowId]);
    }
    
    public function realCreateRow($theRow){
        $this->theData[$theRow['id']] = [];
        $this->theData[$theRow['id']] = $theRow;
        return $theRow['id'];
    }
    
    public function realDeleteRow($rowId) {
        unset($this->theData[$rowId]);
        return true;
    }
    
    public function realUpdateRow($theRow) {
        $keys = array_keys($theRow);
        $id = $theRow['id'];
        
        foreach ($keys as $k){
            $this->theData[$id][$k] = $theRow[$k];
        }
        return true;
    }
    
    public function getMaxId() {
        if (count($this->theData) !== 0){
            return max(array_column($this->theData, 'id'));
        }
        else{
            return 0;
        }
    }
    
    public function getRow($rowId) {
        return $this->theData[$rowId];
    }
    
    public function getIdForKeyValue($key, $value) {
        return array_search($value, array_column($this->theData, $key, 'id'), TRUE);
    }
    
    public function findRow($givenRow) {
        $givenRowKeys = array_keys($givenRow);
        foreach($this->theData as $dataRow){
            $match = true;
            foreach ($givenRowKeys as $key){
                if ($dataRow[$key] !== $givenRow[$key]){
                    $match = false;
                }
            }
            if ($match){
                return ($dataRow['id']);
            }
        }
        return false;
    }
}

/**
 * Implements a data table with MySQL
 * 
 */
class MySQLDataTable extends DataTable {
    
    /** @var PDO */
    protected $db;
    protected $tableName;
    protected $statements;
    
    /**
     * 
     * @param \PDO $theDb  initialized PDO connection
     * @param string $tn  SQL table name
     */
    public function __construct($theDb, $tn) {
        $this->db = $theDb;
        $this->db->setAttribute(PDO::ATTR_STRINGIFY_FETCHES, false);
        $this->tableName = $tn;
        // Pre-prepare common statements
        $this->statements['rowExistsById'] = 
                $this->db->prepare('SELECT id FROM ' . $this->tableName . ' WHERE id= :id');
        $this->statements['deleteRow'] = 
                $this->db->prepare('DELETE FROM `' . $this->tableName . '` WHERE `id`= :id');

    }
    
    public function rowExistsById($rowId) {
        if ($this->statements['rowExistsById']->execute(['id' => $rowId])){
            return $this->statements['rowExistsById']->rowCount() === 1;
        }
        return false;
    }
    
    public function realCreateRow($theRow) {
        $keys = array_keys($theRow);
        $sql = 'INSERT INTO `' . $this->tableName . '` (' . 
                implode(',', $keys) . ') VALUES ';
        $values = [];
        foreach($keys as $key){
            array_push($values, $this->quote($theRow[$key]));
        }
        $sql .= '(' . implode(',', $values) . ');';
        if ($this->db->query($sql) === FALSE){
            //error_log("Can't create, query:  $sql; error info: " . $this->db->errorInfo()[2]);
            return false;
        }
        return $theRow['id'];
    }
    
    public function realUpdateRow($theRow) {
        $keys = array_keys($theRow);
        $sets = array();
        foreach($keys as $key){
            if ($key === 'id'){
                continue;
            }
            array_push($sets, $key . '=' . $this->quote($theRow[$key]));
        }
        
        $sql = 'UPDATE ' . $this->tableName . ' SET ' . 
                implode(',', $sets) . ' WHERE id=' . $theRow['id'];
        //error_log("Executing query: $sql");
        if ($this->db->query($sql) === FALSE){
            return false;
        }
        return $theRow['id'];
    }
    
    public function quote($v){
        if (is_string($v)){
            return $this->db->quote($v);
        }
        if (is_null($v)){
            return 'NULL';
        }
        return (string) $v;
    }
    
    public function getRow($rowId) {
        $r = $this
                ->db
                ->query('SELECT * FROM ' . $this->tableName . ' WHERE `id`=' . $rowId . ' LIMIT 1')
                ->fetch(PDO::FETCH_ASSOC);
        if ($r === false){
            return false;
        }
        $r['id'] = (int) $r['id'];
        return $r;
        
    }
    
    public function getMaxId() {
        $query = 'SELECT MAX(id) FROM ' . $this->tableName;
        $r = $this->db->query($query);
        if ($r === FALSE){
            print("Query returned false: $query\n");
            return 0;
        }
        return $r->fetchColumn();
    }
    
    public function getIdForKeyValue($key, $value) {
        return $this->findRow([$key => $value]);
    }
    
    /**
     * 
     * @param array $theRow
     * @param int $maxResults  
     * @return int/array if $maxResults == 1, returns a single int, if not, 
     *                   returns an array of ints. Returns false if not
     *                   rows are found
     */
    public function findRows($theRow, $maxResults = false) {
        $keys = array_keys($theRow);
        $conditions = [];
        foreach ($keys as $key){
            $c = $key . '=';
            if (is_string($theRow[$key])){
                $c .= $this->db->quote($theRow[$key]);
            } 
            else {
                $c .= $theRow[$key];
            }
            array_push($conditions, $c);
        }
        $sql = 'SELECT id FROM ' . $this->tableName . ' WHERE ' . implode(' AND ', $conditions);
        if ($maxResults){
            $sql .= ' LIMIT ' . $maxResults;
        }
        $r = $this->db->query($sql);
        if ( $r === FALSE){
            return false;
        }
        if ($maxResults == 1){
            $theId = (int) $r->fetchColumn();
            if ($theId == 0){
                return false;
            }
            return  $theId;
        }
        $ids = array();
        while ($id = (int) $r->fetchColumn()){
            array_push($ids, $id);
        }
        if (count($ids)== 0){
            return false;
        }
        return $ids;
    }
    
    public function findRow($theRow){
        return $this->findRows($theRow, 1);
    }
    
    public function realDeleteRow($rowId) {
        return $this->statements['deleteRow']->execute([':id' => $rowId]) !== false;
    }
}

class MySQLDataTableWithRandomIds extends MySQLDataTable {
    
    private $minId, $maxId;
    private $maxTries = 1000;
    
    /**
     * 
     * $min and $max should be carefully chosen so that
     * the method to get new unused id doesn't take too
     * long. 
     * 
     * @param type $theDb
     * @param type $tn
     * @param type $min   Minimum Id
     * @param type $max   Max Id
     */
    public function __construct($theDb, $tn, $min=1, $max=PHP_INT_MAX) {
        $this->minId = $min;
        $this->maxId = $max;
        
        parent::__construct($theDb, $tn);
        
    }
    
    public function getOneUnusedId(){
        for ($i = 0; $i < $this->maxTries; $i++){
            $theId = random_int($this->minId, $this->maxId);
            if (!$this->rowExistsById($theId)){
                return $theId;
            }
        }
        // This part of the code should almost never run in real life!
        //error_log("WARNING: Reached max tries ($this->maxTries) searching for a new rowID for table '$this->tableName', will return maxId+1");
        return $this->getMaxId()+1;
    }
    
}