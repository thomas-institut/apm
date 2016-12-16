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
 * An interface to a table made out of rows addressable by a unique key
 * 
 * The idea is one descendant of this class will implement the
 * table as an SQL table, but an implementation with arrays or
 * with something just as simple can be provided for testing.
 * 
 * By default each row must have a unique key: 'id'
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class DataTable {
    
    /**
     * @return bool true if the row with the given Id exists
     */
    abstract public function rowExistsById($rowId);
    
    /**
     * Attempts to create a new row. 
     * If the given row does not have a value for 'id' or if the value
     * is equal to 0 a new id will be 
     * assigned.
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
    
    abstract protected function realCreateRow($theRow);
        
    
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
     * The real delete function
     */
    abstract protected function realDeleteRow($rowId);
    
    /**
     * @return int a unique id that does not exist in the table
     */
    public function getOneUnusedId(){
        return $this->getMaxId()+1;
    }
    
    
    /**
     * @return int the max id in the table
     */
    abstract protected function getMaxId();
    
    
    abstract protected function getRow($rowId);
    
    
    abstract protected function getIdForKeyValue($key, $value);
    
    /**
     * Searches the table for a row with the same data as the given row
     * 
     * Only the keys given in $theRow are checked; so, for example,
     * if $theRow is missing a key that exists in the actual rows
     * in the table, those missing keys are ignored and the method
     * will return any row that matches exactly the given keys independently
     * of the missing ones.
     */
    abstract protected function findRow($theRow);
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
 * Implements a data table with SQL
 */
class SQLDataTable extends DataTable {
    
    /** @var PDO */
    private $db;
    private $tableName;
    private $statements;
    
    public function __construct($theDb, $tn) {
        $this->db = $theDb;
        $this->tableName = $tn;
        // Pre-prepare common statements
        $this->statements['rowExistsById'] = 
                $this->db->prepare('SELECT `id` FROM `' . $this->tableName . '` WHERE `id`= :id');
        $this->statements['deleteRow'] = 
                $this->db->prepare('DELETE FROM `' . $this->tableName . '` WHERE `id`= :id');

    }
    
    public function rowExistsById($rowId) {
        if ($this->statements['rowExistsById']->execute([':id' => $rowId])){
            return $this->statements['rowExistsById']->rowCount() === 1;
        }
        return false;
    }
    
    public function realCreateRow($theRow) {
        $keys = array_keys($theRow);
        $sql = 'INSERT INTO ' . $this->tableName . ' (' . 
                implode(',', $keys) . ') VALUES ';
        $values = [];
        foreach($keys as $key){
            // Maybe this isn't necessary!
            if (is_string($theRow[$key])){
                array_push($values, $this->db->quote($theRow[$key]));
            }
            else{
                array_push($values, $theRow[$key]);
            }
        }
        $sql .= '(' . implode(',', $values) . ');';
        if ($this->db->query($sql) === FALSE){
            return false;
        }
        return $theRow['id'];
    }
    
    public function getRow($rowId) {
        return $this
                ->db
                ->query('SELECT * FROM ' . $this->tableName . ' WHERE `id`=' . $rowId . ' LIMIT 1')
                ->fetch(PDO::FETCH_ASSOC);
        
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
    
    public function findRow($theRow) {
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
        //print "$sql\n";
        $r = $this->db->query($sql);
        if ( $r === FALSE){
            return false;
        }
        return $r->fetchColumn();
    }
    
    public function realDeleteRow($rowId) {
        return $this->statements['deleteRow']->execute([':id' => $rowId]) !== false;
    }
}