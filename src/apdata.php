<?php
/**
 * @file apdata.php
 * 
 * Database handling class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


require_once 'errorcodes.php';
require_once 'columnelement.php';
require_once 'transcriptiontext.php';
require_once 'editorialnote.php';

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
    
    
    private $databaseversion = '0.02';
    
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
        $query = 'SELECT password from `' . $this->tables['users'] . '` where `username`=\'' . $username . "'";
        $r = $this->query($query);
        if (!$r){
            return ''; // this will never match any password with password_verify
        }
        else{
            $row = $r->fetch_assoc();
            if (isset($row['password'])){
                return $row['password'];
            }
            else {
                return '';
            }
        }
    }

    /**
     * Gets the user id associated with a given username
     */
    function getUserIdByUsername($username){
        return $this->getOneField($this->tables['users'], 'id', "`username` ='" . $username . "'");
    }
    
    function getUsernameById($id){
        return $this->getOneField($this->tables['users'], 'username', "`id` ='" . $id . "'");
    }

    /**
     * Gets the user info from the database
     * @param int $userid User ID
     * @param array $userinfo Array where the information will be stored
     */
    function getUserInfoByUserId($userid){
        return $this->getOneRow('select * from `' . $this->tables['users']  . '` where `id`=' . $userid);
    }
    
    function getUserInfoByUsername($username){
        return $this->getOneRow('select * from `' . $this->tables['users']  . '` where `username`=\'' . $username . "'");
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
     * Gets the given field from the first row of the result
      * set of the given query
     */
    function getOneFieldQuery($query, $field){
        $r = $this->query($query);
        $row = $r->fetch_assoc();
        if (!isset($row[$field])){
            throw new Exception($field . ' not in result set' , E_MYSQL);
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
     
    
    function getOneRow($query){
        $r = $this->query($query);
        return $r->fetch_assoc();
    }
    
    /**
     * @return array
     * Returns an array with the IDs of all the manuscripts with
     * some data in the system and the number of pages with data
     */
    function getDocIdList(){
        $query = "SELECT `id` from  " . $this->tables['docs'];
        $r = $this->query($query);
        
        $mss = array();
        while ($row = $r->fetch_assoc()){
            array_push($mss, $row['id']);
        }
        return $mss;
    }
    
    function getPageCountByDocId($docId){
        return $this->getOneFieldQuery('SELECT `page_count` from ' .  
                $this->tables['docs'] . 
               ' WHERE `id`=\'' . $docId . '\'', 'page_count');
    }
    /**
     * 
     * @param int $docId
     * @return int 
     * Returns the number of pages of the given document
     */
    function getTranscribedPageCountByDoc($docId){
        return $this->getOneFieldQuery(
                'SELECT count(DISTINCT `page_number`) as value from ' . 
                $this->tables['elements'] .
                ' WHERE `doc_id`=\'' . $docId . '\'', 'value');
        
    }
    
    function getLineCountByDoc($docId){
        return $this->getOneFieldQuery(
                'SELECT count(DISTINCT `page_number`, `reference`) as value from ' . 
                $this->tables['elements'] .
                ' WHERE `doc_id`=\'' . $docId . '\' AND `type`=' . ColumnElement::LINE, 'value');
    }
    /**
     * 
     * @param int $docId
     * @return array
     * Returns the editors associated with a document as a list of usernames
     */
    function getEditorsByDocId($docId){
        $te = $this->tables['elements'];
        $tu = $this->tables['users'];
        $query = "SELECT distinct `$tu`.`username`" . 
            " from `$te` JOIN `$tu` on `$te`.`editor_id`=`$tu`.`id`" . 
           " WHERE `doc_id`='" . $docId . "'";
        
        $r = $this->query($query);
        
        $editors = array();
        while ($row = $r->fetch_assoc()){
            array_push($editors, $row['username']);
        }
        return $editors;
    }
    
    function getPageListByDocId($docId){
        $query =  'SELECT distinct `page_number` from ' . 
                $this->tables['elements'] .
                ' WHERE `doc_id`=\'' . $docId . '\' order by `page_number` asc';
        $r = $this->query($query);
        $pages = array();
         while ($row = $r->fetch_assoc()){
            array_push($pages, $row['page_number']);
        }
        return $pages;
    }
    
    function getDoc($docId){
        $query = 'SELECT * FROM ' . $this->tables['docs'] . ' WHERE `id`=' . $docId;
        return $this->getOneRow($query);
    }
    
    /**
     * Returns the image URL for a page or false if the page image source
     * is not recognized
     * @param int $docId
     * @param int $page
     * @return string|boolean
     */
    function getImageUrlByDocId($docId, $page){
        $doc = $this->getDoc($docId);
        $isd = $doc['image_source_data'];
        switch ($doc['image_source']){
            case 'local':
                return sprintf("localrep/%s/%s-%04d.jpg", $isd, $isd, $page);
                break;
            
            case 'dare':
                return sprintf("https://bilderberg.uni-koeln.de/images/books/%s/bigjpg/%s-%04d.jpg", $isd, $isd, $page);
                break;
        }
        return FALSE;
    }
    
    function isPageRightToLeft($docId, $page){
        // Faking it right now, need to come back to it.
        return FALSE;
    }
    
    /**
     * 
     * @param string $docId
     * @param int $page
     * @param int $col
     * @return array of ColumnElement properly initialized
     */
    
    function getColumnElements($docId, $page, $col){
        
        $query = 'SELECT * FROM `' . $this->tables['elements'] . 
                '` WHERE `doc_id`=\'' . $docId . '\' AND' .
                ' `page_number`=' . $page . " AND" . 
                ' `column_number`=' . $col . ' ORDER BY `seq` ASC';
        $r = $this->query($query);
        $elements = array();
        while ($row = $r->fetch_assoc()){
            switch ($row['type']){
                case ColumnElement::LINE:
                    $e = new CeLine();
                    // the line number
                    $e->setLineNumber($row['reference']);
                    break;
                
                case ColumnElement::CUSTODES:
                    $e = new CeCustodes();
                    break;
                
                case ColumnElement::HEAD:
                    $e = new CeHead();
                    break;
                
                case ColumnElement::GLOSS:
                    $e = new CeGloss();
                    break;
                
                default:
                    continue;
            }
            $e->columnNumber = $col;
            $e->documentId = $docId;
            $e->editorId = $row['editor_id'];
            $e->handId = $row['hand_id'];
            $e->id = $row['id'];
            $e->lang = $row['lang'];
            $e->pageNumber = $page;
            //$e->placement = $row['placement'];
            $e->seq = $row['seq'];
            $e->timestamp = $row['time'];
            $e->type = $row['type'];
            
            $e->transcribedText = $this->getTranscribedText($e->id, $e->lang, $e->editorId, $e->handId);
            array_push($elements, $e);
        }
        return $elements;
    }
    
    function getTranscribedText($cid, $lang, $editorId, $handId){
        $query = 'SELECT * FROM `' . $this->tables['items'] . 
                '` WHERE `ce_id`=' . $cid . 
                ' ORDER BY `seq` ASC';
        $r = $this->query($query);
        
        $tt = new TranscriptionText($cid, $lang, $editorId, $handId);
        
        while ($row = $r->fetch_assoc()){
            switch ($row['type']){
                case TranscriptionTextItem::TEXT:
                    $item = new TtiText($row['id'], $row['seq'], $row['text']);
                    break;
                
                case TranscriptionTextItem::RUBRIC:
                    $item = new TtiRubric($row['id'], $row['seq'], $row['text']);
                    break;
                
                case TranscriptionTextItem::SIC:
                    $item = new TtiSic($row['id'], $row['seq'], $row['text'], $row['alt_text']);
                    break;
                
                case TranscriptionTextItem::MARK:
                    $item = new TtiMark($row['id'], $row['seq']);
                    break;
                
                case TranscriptionTextItem::UNCLEAR:
                    $item = new TtiUnclear($row['id'], $row['seq'], $row['extra_info'], $row['text'], $row['alt_text']);
                    break;
                
                case TranscriptionTextItem::ILLEGIBLE:
                    $item = new TtiIllegible($row['id'], $row['seq'], $row['length'], $row['extra_info']);
                    break;
                
                case TranscriptionTextItem::ABBREVIATION:
                    $item = new TtiAbbreviation($row['id'], $row['seq'], $row['text'], $row['alt_text']);
                    break;
                
                default: 
                    continue;
            }
            $item->lang = $row['lang'];
            $item->handId = $row['hand_id'];
            $tt->addItem($item);
        }
        
        return $tt;
    }
    
    function getEditorialNotes($type, $target){
        $query = 'SELECT * FROM `' . $this->tables['ednotes'] . 
                '` WHERE `type`=' . $type . ' AND ' . 
                '`target`=' . $target; 
        $r = $this->query($query);
        if ($r->num_rows === 0){
            return NULL;
        } 
        else {
            $notes = array();
            while ($row = $r->fetch_assoc()){
                $en = new EditorialNote();
                $en->id = $row['id'];
                $en->type = $row['type'];
                $en->authorId=  $row['author_id'];
                $en->lang = $row['lang'];
                $en->target = $row['target'];
                $en->time = $row['time'];
                $en->text = $row['text'];
                array_push($notes, $en);
            }
            return $notes;
        }
    }
    function getEditorialNotesByItemId($id){
        return $this->getEditorialNotes(EditorialNote::INLINE, $id);
    }
    
    
}