<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
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

namespace AverroesProject\Data;

use \PDO;

/**
 * Utility methods to handle MySQL queries
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class MySqlHelper {
    private $dbConn;
    private $logger;
    
    public function __construct($dbConn, $logger) {
        $this->dbConn = $dbConn;
        $this->logger = $logger;
    }
    
    /**
     * Performs a query with error handling
     */

    function query($sql){
        $r = $this->dbConn->query($sql);
        if ($r===false){
           $this->logger->error("Problem with query", $this->dbConn->errorInfo());
        }
        return $r;
    }
    
     /**
     * Gets the given field from the first row of the result
      * set of the given query
     */
    function getOneFieldQuery($query, $field){
        $r = $this->query($query);
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if (!isset($row[$field])){
            return false;
        }
        else{
            return $row[$field];
        }
    }

    function getOneRow($query){
        $r = $this->query($query);
        return $r->fetch(PDO::FETCH_ASSOC);
    }
    
    function getRowById($table, $id) 
    {
        return $this->getOneRow("SELECT * FROM `$table` WHERE id=$id");
    }
    
    function getAllRows($query) {
        $r = $this->query($query);
        if ($r === false) {
            return false;
        }
        return $r->fetchAll(PDO::FETCH_ASSOC);
    }
}
