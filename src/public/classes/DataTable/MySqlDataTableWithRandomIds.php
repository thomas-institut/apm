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

class MySqlDataTableWithRandomIds extends MySqlDataTable
{
    
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