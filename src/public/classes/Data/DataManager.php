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

use AverroesProject\TxText\Item;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Element;

use \PDO;

/**
 * @class AverroesProjectData
 * Provides access to all data via helper functions.
 */
class DataManager {
    
    /**
     *
     * @var array
     * Array of table names
     */
    private $tNames;
    private $dbConn;
    private $logger;
    private $dbh;
    
    /**
     *
     * @var EdNoteManager 
     */
    public $enm; 
    
    /**
     * Tries to initialize and connect to the MySQL database.
     * 
     * Throws an error if there's no connection 
     * or if the database is not setup properly.
     */
    function __construct($dbConn, $tableNames, $logger){
        $this->dbConn = $dbConn;
        $this->tNames = $tableNames;
        $this->logger = $logger;
        $this->dbh = new MySqlHelper($dbConn, $logger);
        $this->enm = new EdNoteManager($this->dbh, $tableNames, $logger);
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
        $r = $this->dbh->query($query);
        
        $mss = array();
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            array_push($mss, $row['id']);
        }
        return $mss;
    }
    
    
    function getNumColumns($docId, $page){
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        $n = $this->dbh->getOneFieldQuery(
                'SELECT MAX(e.`column_number`) AS nc FROM ' . $te . ' AS e' .
                " JOIN `$tp` as p ON p.id=e.page_id " .
                " WHERE p.`doc_id`=$docId AND p.`page_number`=$page", 'nc');
        if ($n === NULL){
            return 0;
        }
        return (int) $n;
    }
    function getPageCountByDocId($docId){
        return $this->dbh->getOneFieldQuery('SELECT `page_count` from ' .  
                $this->tNames['docs'] . 
               ' WHERE `id`=\'' . $docId . '\'', 'page_count');
    }
    
    function getLineCountByDoc($docId){
        return $this->dbh->getOneFieldQuery(
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
        
        $r = $this->dbh->query($query);
        
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
        $r = $this->dbh->query($query);
        $pages = array();
         while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            array_push($pages, $row['page_number']);
        }
        return $pages;
    }
    
    function getDocById($docId)
    {
        return $this->dbh->getRowById($this->tNames['docs'], $docId);
    }
    
    /**
     * Returns the image URL for a page or false if the page image source
     * is not recognized
     * @param int $docId
     * @param int $page
     * @return string|boolean
     */
    function getImageUrlByDocId($docId, $page){
        $doc = $this->getDocById($docId);
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
        $rows = $this->dbh->getAllRows($query);
        $elements = [];
        foreach($rows as $row) {
            switch ($row['type']){
                case Element::LINE:
                    $e = new \AverroesProject\ColumnElement\Line();
                    // the line number
                    $e->setLineNumber($row['reference']);
                    break;
                
                case Element::CUSTODES:
                    $e = new \AverroesProject\ColumnElement\Custodes();
                    break;
                
                case Element::HEAD:
                    $e = new \AverroesProject\ColumnElement\Head();
                    break;
                
                case Element::GLOSS:
                    $e = new \AverroesProject\ColumnElement\Gloss();
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
        $r = $this->dbh->getAllRows($query);
        
        $tt = new ItemArray($cid, $lang, $editorId, $handId);
        
        foreach ($r as $row) {
            switch ($row['type']){
                case Item::TEXT:
                    $item = new \AverroesProject\TxText\Text($row['id'], $row['seq'], 
                            $row['text']);
                    break;
                
                case Item::RUBRIC:
                    $item = new \AverroesProject\TxText\Rubric($row['id'], $row['seq'], 
                            $row['text']);
                    break;
                
                case Item::SIC:
                    $item = new \AverroesProject\TxText\Sic($row['id'], $row['seq'], 
                            $row['text'], $row['alt_text']);
                    break;
                
                case Item::MARK:
                    $item = new \AverroesProject\TxText\Mark($row['id'], $row['seq']);
                    break;
                
                case Item::UNCLEAR:
                    $item = new \AverroesProject\TxText\Unclear($row['id'], $row['seq'], 
                            $row['extra_info'], $row['text'], $row['alt_text']);
                    break;
                
                case Item::ILLEGIBLE:
                    $item = new \AverroesProject\TxText\Illegible($row['id'], $row['seq'], 
                            $row['length'], $row['extra_info']);
                    break;
                
                case Item::ABBREVIATION:
                    $item = new \AverroesProject\TxText\Abbreviation($row['id'], $row['seq'], 
                            $row['text'], $row['alt_text']);
                    break;
                
                case Item::GLIPH:
                    $item = new \AverroesProject\TxText\Gliph($row['id'], $row['seq'], 
                            $row['text']);
                    break;
                
                case Item::DELETION:
                    $item = new \AverroesProject\TxText\Deletion($row['id'], $row['seq'], 
                            $row['text'], $row['extra_info']);
                    break;
                
                case Item::ADDITION:
                    $item = new \AverroesProject\TxText\Addition($row['id'], $row['seq'], 
                            $row['text'], $row['extra_info'], $row['target']);
                    break;
                
                case Item::NO_LINEBREAK:
                    $item = new \AverroesProject\TxText\NoLinebreak($row['id'], $row['seq']);
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
    
 }