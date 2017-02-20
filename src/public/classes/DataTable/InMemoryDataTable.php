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

use \PDO as PDO;

class InMemoryDataTable extends DataTable 
{
    
    private $theData = array();
    
    public function getAllRows() {
        return $theData;
    }
    
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