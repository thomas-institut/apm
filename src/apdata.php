<?php
/**
 * @file apdata.php
 * 
 * Database handling class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


require_once 'errorcodes.php';

/**
 * @class ApData
 * Provides access to all data via helper functions.
 */
class ApData extends mysqli{
   
    /**
     *
     * @var array 
     */
    private $settings;
    
    /**
     *
     * @var array
     * Array of table names
     */
    private $tables;
    
    
    private $databaseversion = '0.01';
    
    /**
     * Tries to initialize and connect to the MySQL database.
     * 
     * Throws an error if there's no connection 
     * or if the database is not setup properly.
     */
    function __construct($dbconfig, $tablenames){

        parent::init();

        $r  = parent::real_connect($dbconfig['host'], $dbconfig['user'], $dbconfig['pwd']);
        if (!$r){
            throw new Exception($this->connect_error, E_MYSQL);
        }

        if (!$this->select_db($dbconfig['db'])){
            throw new Exception($this->error, E_MYSQL);
        }
        $this->query("set character set 'utf8'");
        $this->query("set names 'utf8'");
        
        $this->tables = $tablenames;
        
         // Check if database is initialized
        if (!$this->isInitialized()){
            throw new Exception("Tables not initialized", E_NO_TABLES);
        }
        
        // Load settings
        $this->loadSettings();
        
        // Check that the database's version is up to date
        if ($this->settings['dbversion'] !== $this->databaseversion){
            throw new Exception("Database schema not up to date", E_OUTDATED_DB);
        }
       
    }
    
    function loadSettings(){
         $r = $this->query('select * from ' . $this->tables['settings']);
        
        while ($row = $r->fetch_assoc()){
            $this->settings[$row['key']] = $row['value'];
        }
    }
    
    
    /**
     * @return bool 
     * Returns true is the database is properly initialized
     * (right now just checks that all the tables are there!)
     */
    function isInitialized(){
     
        foreach ($this->tables as $table){
            if (!$this->tableExists($table)){
                return FALSE;
            }
        }
        return TRUE;
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
        $query = 'select * from `' . $this->tables['users'] . '` where `username`=\'' . $username . "'";
        return $this->queryNumRows($query) == 1;
    }

    /**
     * Gets the user password hash in the database.
     */
    function userPassword($username){
        return $this->getOneField($this->tables['users'], 'password', "`username` = '" . $username. "'");
    }

    /**
     * Gets the user id associated with a given username
     */
    function userId($username){
        return $this->getOneField($this->tables['users'], 'id', "`username` ='" . $username . "'");
    }

    /**
     * Gets the user info from the database
     * @param int $userid User ID
     * @param array $userinfo Array where the information will be stored
     */
    function loadUserInfo($userid, &$userinfo){
        $this->loadOneRow('select * from `' . $this->tables['users']  . '` where `id`=' . $userid, $userinfo);
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