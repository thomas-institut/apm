<?php
/**
 * @file AverroesProjectData.php
 * 
 * Database handling class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
namespace AverroesProject;

use AverroesProject\TxText\Item;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Element;
use \PDO;

/**
 * @class AverroesProjectData
 * Provides access to all data via helper functions.
 */
class AverroesProjectData {
    
    /**
     *
     * @var array
     * Array of table names
     */
    private $tNames;
    private $dbh;
    private $logger;
    
    /**
     * Tries to initialize and connect to the MySQL database.
     * 
     * Throws an error if there's no connection 
     * or if the database is not setup properly.
     */
    function __construct($dbh, $tablenames, $logger){
        $this->dbh = $dbh;
        $this->tNames = $tablenames;
        $this->logger = $logger;
    }

    /**
     * Performs a query with error handling
     */

    function query($sql){
        $r = $this->dbh->query($sql);
        if ($r===false){
           $this->logger->error("Problem with query", $this->dbh->errorInfo());
        }
        return $r;
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
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if (!isset($row[$field])){
            return false;
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
    
    /**
     * @return array
     * Returns an array with the IDs of all the manuscripts with
     * some data in the system and the number of pages with data
     */
    function getDocIdList($order = '', $asc=true){
        switch ($order){
            case 'title':
                $orderby = ' ORDER BY `title` ' . ($asc ? ' ASC' : ' DESC');
                break;
            
            default:
                $orderby = '';
        }
        $query = "SELECT `id` FROM  " . $this->tNames['docs'] . $orderby;
        $r = $this->query($query);
        
        $mss = array();
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            array_push($mss, $row['id']);
        }
        return $mss;
    }
    
    
    function getNumColumns($docId, $page){
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        $n = $this->getOneFieldQuery(
                'SELECT MAX(e.`column_number`) AS nc FROM ' . $te . ' AS e' .
                " JOIN `$tp` as p ON p.id=e.page_id " .
                " WHERE p.`doc_id`=$docId AND p.`page_number`=$page", 'nc');
        if ($n === NULL){
            return 0;
        }
        return (int) $n;
    }
    function getPageCountByDocId($docId){
        return $this->getOneFieldQuery('SELECT `page_count` from ' .  
                $this->tNames['docs'] . 
               ' WHERE `id`=\'' . $docId . '\'', 'page_count');
    }
    
    function getLineCountByDoc($docId){
        return $this->getOneFieldQuery(
                'SELECT count(DISTINCT `page_id`, `reference`) as value from ' . 
                $this->tNames['elements'] . ' as e JOIN ' . 
                $this->tNames['pages'] . ' AS p ON e.page_id=p.id ' .
                ' WHERE p.doc_id=\'' . $docId . '\' AND e.type=' . 
                Element::LINE, 'value');
    }
    /**
     * 
     * @param int $docId
     * @return array
     * Returns the editors associated with a document as a list of usernames
     */
    function getEditorsByDocId($docId){
        $te = $this->tNames['elements'];
        $tu = $this->tNames['users'];
        $tp = $this->tNames['pages'];
        $query = "SELECT DISTINCT u.`username`" . 
            " FROM `$tu` AS u JOIN (`$te` AS e, `$tp` as p)" . 
            " ON (u.id=e.editor_id AND p.id=e.page_id)" . 
            " WHERE p.doc_id=" . $docId;
        
        $r = $this->query($query);
        
        $editors = array();
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            array_push($editors, $row['username']);
        }
        return $editors;
    }
    
    function getPageListByDocId($docId){
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        $query =  'SELECT DISTINCT p.`page_number` AS page_number FROM ' . 
                $tp . ' AS p' .
                ' JOIN ' . $te . ' AS e ON p.id=e.page_id' .
                ' WHERE p.doc_id=\'' . $docId . 
                '\' ORDER BY p.`page_number` ASC';
        $r = $this->query($query);
        $pages = array();
         while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            array_push($pages, $row['page_number']);
        }
        return $pages;
    }
    
    function getDoc($docId){
        $query = 'SELECT * FROM ' . $this->tNames['docs'] . ' WHERE `id`=' . 
                $docId;
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
                return sprintf("/localrep/%s/%s-%04d.jpg", $isd, $isd, $page);
                break;
            
            case 'dare':
                return sprintf("https://bilderberg.uni-koeln.de/images/books/%s/bigjpg/%s-%04d.jpg", 
                        $isd, $isd, $page);
                break;
        }
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
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        $query = 'SELECT e.* FROM `' . $te . '` AS e' . 
                ' JOIN ' . $tp . ' AS p ON e.page_id=p.id WHERE p.`doc_id`=\'' .
                $docId . '\' AND' .
                ' p.`page_number`=' . $page . " AND" . 
                ' e.`column_number`=' . $col . ' ORDER BY e.`seq` ASC';
        $r = $this->query($query);
        $elements = array();
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            switch ($row['type']){
                case Element::LINE:
                    $e = new ColumnElement\Line();
                    // the line number
                    $e->setLineNumber($row['reference']);
                    break;
                
                case Element::CUSTODES:
                    $e = new ColumnElement\Custodes();
                    break;
                
                case Element::HEAD:
                    $e = new ColumnElement\Head();
                    break;
                
                case Element::GLOSS:
                    $e = new ColumnElement\Gloss();
                    break;
                
                default:
                    continue;
            }
            $e->columnNumber = (int) $col;
            $e->documentId = (int) $docId;
            $e->editorId = (int) $row['editor_id'];
            $e->handId = (int) $row['hand_id'];
            $e->id = (int) $row['id'];
            $e->lang = $row['lang'];
            $e->pageNumber = (int) $page;
            //$e->placement = $row['placement'];
            $e->seq = (int) $row['seq'];
            $e->timestamp = $row['time'];
            $e->type = (int) $row['type'];
            
            $e->items = $this->getItemsForElement($e->id, $e->lang, 
                    $e->editorId, $e->handId);
            array_push($elements, $e);
        }
        return $elements;
    }
    
    function getItemsForElement($cid, $lang, $editorId, $handId){
        $query = 'SELECT * FROM `' . $this->tNames['items'] . 
                '` WHERE `ce_id`=' . $cid . 
                ' ORDER BY `seq` ASC';
        $r = $this->query($query);
        
        $tt = new ItemArray($cid, $lang, $editorId, $handId);
        
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            switch ($row['type']){
                case Item::TEXT:
                    $item = new TxText\Text($row['id'], $row['seq'], 
                            $row['text']);
                    break;
                
                case Item::RUBRIC:
                    $item = new TxText\Rubric($row['id'], $row['seq'], 
                            $row['text']);
                    break;
                
                case Item::SIC:
                    $item = new TxText\Sic($row['id'], $row['seq'], 
                            $row['text'], $row['alt_text']);
                    break;
                
                case Item::MARK:
                    $item = new TxText\Mark($row['id'], $row['seq']);
                    break;
                
                case Item::UNCLEAR:
                    $item = new TxText\Unclear($row['id'], $row['seq'], 
                            $row['extra_info'], $row['text'], $row['alt_text']);
                    break;
                
                case Item::ILLEGIBLE:
                    $item = new TxText\Illegible($row['id'], $row['seq'], 
                            $row['length'], $row['extra_info']);
                    break;
                
                case Item::ABBREVIATION:
                    $item = new TxText\Abbreviation($row['id'], $row['seq'], 
                            $row['text'], $row['alt_text']);
                    break;
                
                case Item::GLIPH:
                    $item = new TxText\Gliph($row['id'], $row['seq'], 
                            $row['text']);
                    break;
                
                case Item::DELETION:
                    $item = new TxText\Deletion($row['id'], $row['seq'], 
                            $row['text'], $row['extra_info']);
                    break;
                
                case Item::ADDITION:
                    $item = new TxText\Addition($row['id'], $row['seq'], 
                            $row['text'], $row['extra_info'], $row['target']);
                    break;
                
                case Item::NO_LINEBREAK:
                    $item = new TxText\NoLinebreak($row['id'], $row['seq']);
                    break;
                
                default: 
                    continue;
            }
            $item->lang = $row['lang'];
            $item->handId = $row['hand_id'];
            $item->setColumnElementId($row['ce_id']);
            $tt->addItem($item, true);
        }
        
        return $tt;
    }
    
    function getEditorialNotes($type, $target){
        $query = 'SELECT * FROM `' . $this->tNames['ednotes'] . 
                '` WHERE `type`=' . $type . ' AND ' . 
                '`target`=' . $target; 
        $r = $this->query($query);
        if ($r->num_rows === 0){
            return NULL;
        } 
        else {
            $notes = array();
            while ($row = $r->fetch(PDO::FETCH_ASSOC)){
                $en = new EditorialNote();
                $en->id = (int) $row['id'];
                $en->type = (int) $row['type'];
                $en->authorId=  (int) $row['author_id'];
                $en->lang = (int) $row['lang'];
                $en->target = (int) $row['target'];
                $en->time = $row['time'];
                $en->text = $row['text'];
                array_push($notes, $en);
            }
            return $notes;
        }
    }
        
    function getEditorialNotesByDocPageCol($docId, $pageNum, $colNumber=1){
        $ted = $this->tNames['ednotes'];
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $query = "SELECT `$ted`.* from `$ted` " . 
                "JOIN `$ti` on `$ted`.`target`=`$ti`.`id` " . 
                "JOIN `$te` on `$te`.`id`= `$ti`.`ce_id` " . 
                "JOIN `$tp` on `$tp`.`id`= `$te`.`page_id` " . 
                "WHERE `$tp`.`doc_id`=$docId and `$tp`.`page_number`=$pageNum "
                . "AND `$te`.`column_number`=$colNumber";
        
        $r = $this->query($query);
        if ($r->rowCount() === 0){
            return NULL;
        } 
        else {
            $notes = array();
            while ($row = $r->fetch(PDO::FETCH_ASSOC)){
                $en = new EditorialNote();
                $en->id = (int) $row['id'];
                $en->type = (int) $row['type'];
                $en->authorId=  (int) $row['author_id'];
                $en->lang = $row['lang'];
                $en->target = (int) $row['target'];
                $en->time = $row['time'];
                $en->text = $row['text'];
                array_push($notes, $en);
            }
            return $notes;
        }
    }
 }