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

namespace AverroesProject\DataTable;

use \PDO;

/**
 * Implements a data table with MySQL
 * 
 */
class MySqlDataTable extends DataTable
{
    
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
    
    public function getAllRows() {
        $r = $this
                ->db
                ->query('SELECT * FROM ' . $this->tableName);
        $rows = array();
        
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            array_push($rows, $row);
        }
        
        return $rows;
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

