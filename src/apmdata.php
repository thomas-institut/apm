<?php
/**
 * @file apmdata.php
 * 
 * Database handling class
 * @author Rafael Nájera <rafael.najera@nuni-koeln.de>
 */


require_once 'config.php';
require_once 'params.php';
require_once 'error.php';

/**
 * @class apmData
 * Provides access to all data via helper functions.
 */
class apmData extends mysqli{
   
    /**
     * Tries to initialize and connect to the MySQL database.
     * 
     * Throws an error if there's no connection 
     * or if the database is not setup properly.
     */
    function __construct(){

        global $config;

        parent::init();

        $r  = parent::real_connect($config['host'], $config['user'], $config['pwd']);
        if (!$r){
            throw new Exception($this->connect_error, E_MYSQL);
        }

        if (!$this->select_db($config['db'])){
            throw new Exception($this->error, E_MYSQL);
        }
        $this->query("set character set 'utf8'");
        $this->query("set names 'utf8'");

         // Check if database is initialized
        if (!$this->tableExists('apm_users')){
            throw new Exception("Tables not initialized", E_NO_TABLES);
        }
    }

    /**
     * Performs a query with error handling
     */

    function query($query, $resultmode = MYSQLI_STORE_RESULT){
        $r = parent::query($query, $resultmode);
        if ($r===false){
            throw new Exception($this->error, E_MYSQL);
        }
        return $r;
    }
    
    /**
     * Checks whether a table exists in the database.
     * @param string $table 
     */
    function tableExists($table){
        $sql = "show tables like '".$table."'";
        $r = $this->query($sql);
        if (!$r){
            return 0;
        }
        else{
            return ($r->num_rows > 0);
        }
    }
    
    /**
     * Checks if a username exists in the database.
     * @param string $username 
     */
    function usernameExists($username){
        $query = "select * from `apm_users` where `username`='" . $username . "'";
        return $this->queryNumRows($query) == 1;
    }

    /**
     * Gets the user password hash in the database.
     */
    function userPassword($username){
        return $this->getOneField('apm_users', 'password', "`username` = '" . $username. "'");
    }

    /**
     * Gets the user id associated with a given username
     */
    function userId($username){
        return $this->getOneField('apm_users', 'id', "`username` ='" . $username . "'");
    }

    /**
     * Gets the user info from the database
     * @param int $userid User ID
     * @param array $userinfo Array where the information will be stored
     */
    function loadUserInfo($userid, &$userinfo){
        $this->loadOneRow('select * from `apm_users` where `id`=' . $userid, $userinfo);
    }

     
   /**
     * Queries the DB and returns the number of resulting rows
     */
    function queryNumRows($query){
        $r = $this->query($query);
        return $r->num_rows;
    }

    /**
     * Gets the given field from the first row where the given condition is met.
     * @param string $table Table to lookup
     * @param string $field Field to retrieve
     * @param string $condition SQL code after WHERE in the query
     */
    function getOneField($table, $field, $condition){
        $query = 'select * from `' . $table . '` where ' . $condition;
        $r = $this->query($query);
        $row = $r->fetch_assoc();
        if (!isset($row[$field])){
            throw new Exception($field . ' not in ' . $table, E_MYSQL);
        }
        else{
            return $row[$field];
        }
    }

      /**
     * Gets the first row of a query as an array association.
     * @param string $query MySQL query to execute
     * @param string $data Array where the row will be stored
     */
    function loadOneRow($query, &$data){
        $r = $this->query($query);
        $data = $r->fetch_assoc();
    }
     
}
?>