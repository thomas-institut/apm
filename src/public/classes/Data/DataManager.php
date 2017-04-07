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
use DataTable\MySqlDataTable;
use DataTable\MySqlDataTableWithRandomIds;
use AverroesProject\Algorithm\MyersDiff;
use AverroesProject\Algorithm\Utility;


use \PDO;

/**
 * @class AverroesProjectData
 * Provides access to data via helper functions.
 */
class DataManager 
{
    const MIN_USER_ID = 10000;
    const MAX_USER_ID= 100000;
    
    /**
     *
     * @var array
     * Array of table names
     */
    private $tNames;
    /**
     *
     * @var \PDO
     */
    private $dbConn;
    /**
     *
     * @var \Monolog\Logger
     */
    private $logger;
    
    /**
     *
     * @var MySqlHelper
     */
    private $dbh;
    
    /**
     *
     * @var EdNoteManager 
     */
    public $enm; 
    
    
    /**
     *
     * @var DataTable\MySqlDataTable
     */
    private $pagesDataTable;
    
    /**
     *
     * @var Data\UserManager
     */
    public $um;
    
    
     /**
     *
     * @var DataTable\MySqlDataTable
     */
    private $docsDataTable;
    
    /**
     *
     * @var DataTable\MySqlDataTable
     */
    private $elementsDataTable;
    
    /**
     *
     * @var DataTable\MySqlDataTable 
     */
    private $itemsDataTable;
    
    /**
     * Tries to initialize and connect to the MySQL database.
     * 
     * Throws an error if there's no connection 
     * or if the database is not setup properly.
     */
    function __construct($dbConn, $tableNames, $logger)
    {
        $this->dbConn = $dbConn;
        $this->tNames = $tableNames;
        $this->logger = $logger;
        $this->dbh = new MySqlHelper($dbConn, $logger);
        $this->enm = new EdNoteManager($dbConn, $this->dbh, $tableNames, 
                $logger);
        $this->um = new UserManager(
            new MySqlDataTable($dbConn, 
                    $tableNames['users']),
            new MySqlDataTable($dbConn, $tableNames['relations']), 
            new MySqlDataTableWithRandomIds($dbConn, 
                    $tableNames['people'], 
                    self::MIN_USER_ID, self::MAX_USER_ID));
        
        
        $this->docsDataTable = new MySqlDataTable($this->dbConn, 
                $tableNames['docs']);
        $this->pagesDataTable = new \DataTable\MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['pages']);
        $this->elementsDataTable = new \DataTable\MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['elements']);
        $this->itemsDataTable = new \DataTable\MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['items']);
    }
   
    
    /**
     * @return array
     * Returns an array with the IDs of all the manuscripts with
     * some data in the system and the number of pages with data
     */
    function getDocIdList($order = '', $asc=true)
    {
        switch ($order){
            case 'title':
                $orderby = ' ORDER BY `title` ' . ($asc ? ' ASC' : ' DESC');
                break;
            
            default:
                $orderby = '';
        }
        $query = "SELECT `id` FROM  " . $this->tNames['docs'] . $orderby;
        $r = $this->dbh->query($query);
        
        $docIds = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            $docIds[] = $row['id'];
        }
        return $docIds;
    }
    
    
    /**
     * Creates a new document in the system.
     * Returns the doc Id of the newly created document or false
     * if the document could not be created
     * 
     * @param string $title
     * @param string $shortTitle
     * @param int $pageCount
     * @param string $lang
     * @param string $type
     * @param string $imageSource
     * @param string $imageSourceData
     * @return int|boolean
     */
    public function newDoc(string $title, string $shortTitle, int $pageCount, 
            string $lang, string $type, 
            string $imageSource, string $imageSourceData) 
    {
        
        $doc = [ 
            'title' => $title, 
            'short_title' => $shortTitle,
            'page_count' => $pageCount,
            'lang' => $lang, 
            'doc_type' => $type,
            'image_source' => $imageSource, 
            'image_source_data' => $imageSourceData
            ];
        
        $docId = $this->docsDataTable->createRow($doc);
        if ($docId === false) {
            // This means a database error
            // Can't reproduce in testing for now
            return false; // @codeCoverageIgnore
        }
        for ($i = 1; $i <= $pageCount; $i++) {
            $pageId = $this->newPage($docId, $i, $lang);
            if ($pageId === false) {
                // This means a database error
                // Can't reproduce in testing for now
                return false; // @codeCoverageIgnore
            }
        }
        return $docId;
    }
    
    /**
     * Creates a new page for document Id
     * 
     * @param type $docId
     * @param type $pageNumber
     * @param type $lang
     * @param type $type
     * @return boolean|int
     */
    public function newPage($docId,  $pageNumber, $lang, $type=0)
    {
        
        $page = [
           'doc_id' => $docId,
           'page_number' => $pageNumber,
            'type' => $type,
            'lang' => $lang
            // foliation => defaults to null in DB
        ];
        
        return $this->pagesDataTable->createRow($page);
    }
    
    /**
     * Returns the number of columns a given page
     * 
     * @param type $docId
     * @param type $page
     * @return int
     */
    function getNumColumns($docId, $page)
    {
        $pInfo = $this->getPageInfoByDocPage($docId, $page);
        if ($pInfo === false) {
            // Page or doc not found
            return 0;
        }
        return (int) $pInfo['num_cols'];
    }
    
    /**
     * Adds a new column to a page
     * 
     * @param type $docId
     * @param type $pageNumber
     * @return boolean
     */
    function addNewColumn($docId, $pageNumber)
    {
        $pageId = $this->getPageIdByDocPage($docId, $pageNumber);
        if ($pageId === false) {
            return false;
        }
        $pageInfo = $this->pagesDataTable->getRow($pageId);
        $result = $this->pagesDataTable->updateRow([
            'id' => $pageId,
            'num_cols' => $pageInfo['num_cols']+1
        ]);
        return $result !== false;
    }
    
    /**
     * Returns an associative array with the information about a page
     * @param type $docId
     * @param type $pageNumber
     * @return array|boolean
     */
    function getPageInfoByDocPage($docId, $pageNumber)
    {
        $id = $this->getPageIdByDocPage($docId, $pageNumber);
        if ($id === false) {
            return false;
        }
        return $this->getPageInfo($id);
    }
    
    public function getPageInfo($pageId)
    {
        return $this->pagesDataTable->getRow($pageId);
    }
    
    /**
     * Returns the number of pages of a document
     * @param type $docId
     * @return boolean|int
     */
    function getPageCountByDocId($docId)
    {
        $row = $this->docsDataTable->getRow($docId);
        if ($row === false) {
            // Doc doesn't exist, so it has 0 pages
            return 0;
        }
        if (!isset($row['page_count'])) {
            // This means that the DB is inconsistent
            return false; // @codeCoverageIgnore
        }
        return $row['page_count'];
    }
    
    /**
     * Returns the number of lines with transcription for a document
     * @param type $docId
     * @return int
     */
    function getLineCountByDoc($docId){
        $now = \DataTable\MySqlUnitemporalDataTable::now();
        
        return $this->dbh->getOneFieldQuery(
            'SELECT count(DISTINCT `page_id`, `reference`) as value from ' . 
                $this->tNames['elements'] . ' as e JOIN ' . 
                $this->tNames['pages'] . ' AS p ON e.page_id=p.id ' .
                ' WHERE p.doc_id=' . $docId . 
                ' AND e.type=' . Element::LINE . 
                " AND `e`.`valid_from` <='$now' AND `e`.`valid_until` > '$now'", 
            'value'
        );
    }
    /**
     * Returns the editors associated with a document as a list of usernames
     * @param int $docId
     * @return array
     */
    function getEditorsByDocId($docId)
    {
        $te = $this->tNames['elements'];
        $tu = $this->tNames['users'];
        $tp = $this->tNames['pages'];
        $now = \DataTable\MySqlUnitemporalDataTable::now();
        
        $query = "SELECT DISTINCT u.`username`" . 
            " FROM `$tu` AS u JOIN (`$te` AS e, `$tp` as p)" . 
            " ON (u.id=e.editor_id AND p.id=e.page_id)" . 
            " WHERE p.doc_id=" . $docId . 
            " AND `e`.`valid_from` <='$now' AND `e`.`valid_until` > '$now'";
        
        $r = $this->dbh->query($query);
        
        $editors = array();
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            array_push($editors, $row['username']);
        }
        return $editors;
    }
    
    /**
     * Returns the page numbers of the pages with transcription
     * data for a document Id
     * @param type $docId
     * @return array
     * 
     */
    function getPageListByDocId($docId)
    {
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        $now = \DataTable\MySqlUnitemporalDataTable::now();
        
        $query =  'SELECT DISTINCT p.`page_number` AS page_number FROM ' . 
                $tp . ' AS p' .
                ' JOIN ' . $te . ' AS e ON p.id=e.page_id' .
                ' WHERE p.doc_id=' . $docId . 
                " AND `e`.`valid_from` <='$now' AND `e`.`valid_until` > '$now'" . 
                " AND `p`.`valid_from` <='$now' AND `p`.`valid_until` > '$now'" . 
                ' ORDER BY p.`page_number` ASC';
        $r = $this->dbh->query($query);
        $pages = array();
         while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            array_push($pages, $row['page_number']);
        }
        return $pages;
    }
    
    /**
     * Returns the document information for the given document Id
     * @param type $docId
     * @return array
     */
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
        $pageId = $this->getPageIdByDocPage($docId, $page);
        if ($pageId === false) {
            // Non-existent page
            return [];
        }
        
        $rows = $this->elementsDataTable->findRows([
            'page_id' => $pageId,
            'column_number' => $col
        ]);
        Utility::arraySortByKey($rows, 'seq');

        $elements = [];
        foreach($rows as $row) {
            $e = $this->createElementObjectFromRow($row);
            $e->items = $this->getItemsForElement($e);
            array_push($elements, $e);
        }
        return $elements;
    }
    
    function getItemsForElement($element)
    {
        $rows = $this->itemsDataTable->findRows([
            'ce_id' => $element->id
        ]);
        
        Utility::arraySortByKey($rows, 'seq');
        
        $tt=[];
        
        foreach ($rows as $row) {
            $item = $this->createItemObjectFromRow($row);
            ItemArray::addItem($tt, $item, true);
        }
        return $tt;
    }
    
    public function getPageIdByDocPage($docId, $pageNum)
    {
        $row = $this->pagesDataTable->findRow([
            'doc_id' => $docId, 
            'page_number'=> $pageNum
            ]);
        if ($row === false) {
            return false;
        }
        return $row['id'];
    }
    
    /**
     * Creates a new element in the database. 
     * Return the newly created element, which will be a copy of the
     * given element with system ids for itself and for its items.
     * 
     * if $insertAtEnd is false, the given element's sequence will be
     * respected and the rest of the elements of the column will be
     * moved to accommodate the new element's position.
     * 
     * @param Element $element
     * @param boolean $insertAtEnd
     * @return Element
     */
    public function insertNewElement(Element $element, $insertAtEnd = true) 
    {
        // Quick checks on the element itself
        if ($element->id !== Element::ID_NOT_SET) {
            $this->logger->notice('Element with a valid '
                    . 'id is being inserted as new', ['id' => $element->id]);
        }
        
        if (is_null($element->pageId)) {
            $this->logger->error('Element being inserted in '
                    . 'null page', ['pageid' => $element->pageId]);
            return false;
        }
        
        if ($element->columnNumber <= 0) {
            $this->logger->error('Element being inserted in '
                    . 'column <= 0', ['pageid' => $element->pageId]);
            return false;
        }
        
        if (count($element->items) === 0) {
            $this->logger->error('Empty element being inserted', 
                    ['pageid' => $element->pageId, 
                        'colnum' => $element->columnNumber, 
                        'editor' => $element->editorId]);
            return false;
        }
        
        if (!in_array($element->lang, ['la', 'he', 'ar'])) {
            $this->logger->error('Element with invalid language being inserted', 
                    ['pageid' => $element->pageId, 
                        'colnum' => $element->columnNumber, 
                        'editor' => $element->editorId, 
                        'lang' => $element->lang]);
            return false;
        }
        
        // Database checks
        $pageInfo = $this->getPageInfo($element->pageId);
        
        if ($pageInfo === false) {
            $this->logger->error('Element being inserted in '
                    . 'non-existent page', ['pageid' => $element->pageId]);
            return false;
        }

        if ($element->columnNumber > $pageInfo['num_cols']) {
            $this->logger->error('Element being inserted in '
                    . 'non-existent colum', 
                    ['pageid' => $element->pageId, 
                        'colnum' => $element->columnNumber]);
            return false;
        }
        
        if (!$this->um->userExistsById($element->editorId)) {
            $this->logger->error('Element being inserted by '
                    . 'non-existent editor', 
                    ['pageid' => $element->pageId, 
                        'colnum' => $element->columnNumber, 
                        'editor' => $element->editorId]);
            return false;
        }
        
        
        $maxSeq = $this->getMaxElementSeq($element->pageId, 
                    $element->columnNumber);
        if (!$insertAtEnd && $element->seq > $maxSeq) {
            // No holes in sequence, insert at end for higher than max
            // values
            $insertAtEnd = true;
        }
        // Now we have a good element
        $newElement = clone $element;
        //$newElement->timestamp = date("Y-m-d H:i:s"); 
        if ($insertAtEnd) {
            // Simplest case, overwrite element's sequence
            $newElement->seq = $maxSeq+1;
        } else {
            // Need to reposition the rest of the elements in the column
            $pageInfo = $this->getPageInfo($newElement->pageId);
            $docId = $pageInfo['doc_id'];
            $pageNumber = $pageInfo['page_number'];
            $columnElements = $this->getColumnElements($docId, 
                    $pageNumber, 
                    $newElement->columnNumber);
            foreach ($columnElements as $cElement) {
                if ($cElement->seq >= $newElement->seq) {
                    $cElement->seq++;
                    $this->updateElementInDB($cElement);
                }
            }
        }
        // Now just create the new element
        $newId = $this->createNewElementInDB($newElement);
        if ($newId === false) {
            // This means a database error
            // Can't reproduce in testing for now
            // @codeCoverageIgnoreStart
            $this->logger->error('Can\'t save new element in DB', 
                ['pageid' => $element->pageId, 
                    'seq' => $newElement->seq,
                    'colnum' => $element->columnNumber, 
                    'editor' => $element->editorId]);
            return false;
            // @codeCoverageIgnoreEnd
        }

        foreach ($newElement->items as $item) {
            $item->columnElementId = $newId;
            // Forcing hands right now, this should change in the future
            $item->handId = $newElement->handId;
            if ($item->lang == '') {
                $item->lang = $newElement->lang;
            }
            if ($this->createNewItemInDB($item) === false ) {
                // This means a database error
                // Can't reproduce in testing for now
                // @codeCoverageIgnoreStart
                $this->logger->error('Can\'t save new items in DB', 
                ['pageid' => $element->pageId, 
                    'seq' => $newElement->seq,
                    'colnum' => $element->columnNumber, 
                    'editor' => $element->editorId, 
                    'itemtype' => $item->type,
                    'itemseq' => $item->seq
                    ]); 
                return false;
                // @codeCoverageIgnoreEnd
            }
        }
        return $this->getElementById($newId);
    }
        
    private function createNewItemInDB($item) 
    {
        return $this->itemsDataTable->createRow([
            'ce_id'=> $item->columnElementId,
            'type' => $item->type,
            'seq' => $item->seq,
            'lang' => $item->lang,
            'hand_id' => $item->handId,
            'text' => $item->theText,
            'alt_text' => $item->altText,
            'extra_info' => $item->extraInfo,
            'length' => $item->length,
            'target' => $item->target
        ]);
    }
    
    private function updateItemInDB($item)
    {
        return $this->itemsDataTable->updateRow([
            'id' => $item->id,
            'ce_id'=> $item->columnElementId,
            'type' => $item->type,
            'seq' => $item->seq,
            'lang' => $item->lang,
            'hand_id' => $item->handId,
            'text' => $item->theText,
            'alt_text' => $item->altText,
            'extra_info' => $item->extraInfo,
            'length' => $item->length,
            'target' => $item->target
        ]);
    }
    private function createNewElementInDB($element) 
    {
        return $this->elementsDataTable->createRow([
                'type' => $element->type,
                'page_id' => $element->pageId,
                'column_number' => $element->columnNumber,
                'seq' => $element->seq,
                'lang' => $element->lang,
                'editor_id' => $element->editorId,
                'hand_id' => $element->handId,
                'reference' => $element->reference,
                'placement' => $element->placement
            ]);
    }
    
    private function updateElementInDB($element) 
    {
        return $this->elementsDataTable->updateRow([
                'id' => $element->id,
                'type' => $element->type,
                'page_id' => $element->pageId,
                'column_number' => $element->columnNumber,
                'seq' => $element->seq,
                'lang' => $element->lang,
                'editor_id' => $element->editorId,
                'hand_id' => $element->handId,
                'reference' => $element->reference,
                'placement' => $element->placement
            ]);
    }
    
       
    private function getMaxElementSeq($pageId, $col)
    {
        $now = \DataTable\MySqlUnitemporalDataTable::now();
        
        $te = $this->tNames['elements'];
        $sql = "SELECT MAX(seq) as m FROM $te "
                . "WHERE page_id=$pageId AND column_number=$col " 
                . "AND `valid_from` <= '$now' AND `valid_until` > '$now'";
        $row = $this->dbh->getOneRow($sql);
        return (int) $row['m'];
    }
    
    public  function getItemById($itemId)
    {
        $row = $this->itemsDataTable->getRow($itemId);
         if ($row=== false) {
            return false;
        }
        return $this->createItemObjectFromRow($row);
    }


    public function getElementById($elementId) {
        $row = $this->elementsDataTable->getRow($elementId);
        
        if ($row=== false) {
            return false;
        }
        $e = $this->createElementObjectFromRow($row);
        $e->items = $this->getItemsForElement($e);
        return $e;
        
    }
    
    private function createElementObjectFromRow($row) 
    {
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
        $e->columnNumber = (int) $row['column_number'];
        $e->pageId = (int) $row['page_id'];
        $e->seq = (int) $row['seq'];
        $e->editorId = (int) $row['editor_id'];
        $e->handId = (int) $row['hand_id'];
        $e->id = (int) $row['id'];
        $e->lang = $row['lang'];
        return $e;
    }
    
    private function createItemObjectFromRow($row)
    {
        switch ($row['type']){
            case Item::TEXT:
                $item = new \AverroesProject\TxText\Text($row['id'], 
                        $row['seq'], 
                        $row['text']);
                break;

            case Item::RUBRIC:
                $item = new \AverroesProject\TxText\Rubric($row['id'], 
                        $row['seq'], 
                        $row['text']);
                break;

            case Item::SIC:
                $item = new \AverroesProject\TxText\Sic($row['id'], 
                        $row['seq'], 
                        $row['text'], 
                        $row['alt_text']);
                break;

            case Item::MARK:
                $item = new \AverroesProject\TxText\Mark($row['id'], 
                        $row['seq']);
                break;

            case Item::UNCLEAR:
                $item = new \AverroesProject\TxText\Unclear($row['id'], 
                        $row['seq'], 
                        $row['extra_info'], 
                        $row['text'], 
                        $row['alt_text']);
                break;

            case Item::ILLEGIBLE:
                $item = new \AverroesProject\TxText\Illegible($row['id'], 
                        $row['seq'], 
                        $row['length'], 
                        $row['extra_info']);
                break;

            case Item::ABBREVIATION:
                $item = new \AverroesProject\TxText\Abbreviation($row['id'], 
                        $row['seq'], 
                        $row['text'], 
                        $row['alt_text']);
                break;

            case Item::GLIPH:
                $item = new \AverroesProject\TxText\Gliph($row['id'], 
                        $row['seq'], 
                        $row['text']);
                break;

            case Item::DELETION:
                $item = new \AverroesProject\TxText\Deletion($row['id'], 
                        $row['seq'], 
                        $row['text'], 
                        $row['extra_info']);
                break;

            case Item::ADDITION:
                $item = new \AverroesProject\TxText\Addition($row['id'], 
                        $row['seq'], 
                        $row['text'], 
                        $row['extra_info'], 
                        $row['target']);
                break;

            case Item::NO_LINEBREAK:
                $item = new \AverroesProject\TxText\NoLinebreak($row['id'], 
                        $row['seq']);
                break;

            default: 
                continue;
        }
        $item->lang = $row['lang'];
        $item->handId = $row['hand_id'];
        $item->setColumnElementId($row['ce_id']);
        return $item;
        
    }
    
    /**
     * Updates an element in the database. 
     * If there's a change in the element's data besides the items, the current
     * version in the DB will be updated.
     *
     * The items will be updated as necessary.
     *
     * Returns the id of the updated element
     * 
     * @param Element $newElement
     */
    public function updateElement(Element $newElement, Element $oldElement)
    {
        // Force IDs to be same, we're only dealing with the element's data
        if ($newElement->id !== $oldElement->id) {
                $newElement->id = $oldElement->id;
        }
        if (!Element::isElementDataEqual($newElement, $oldElement)) {
            $this->updateElementInDB($newElement);
        }
        
        $editScript = ItemArray::getEditScript(
            $oldElement->items,
            $newElement->items
        );
       
        foreach ($editScript as $editInstruction) {
            list ($index, $cmd, $newSeq) = $editInstruction;
            switch ($cmd) {
                case MyersDiff::KEEP:
                    print "Keeping item $index\n";
                    if ($oldElement->items[$index]->seq 
                            !== $newSeq) {
                        print "... with new seq $newSeq";
                        $oldElement->items[$index]->seq =
                                $newSeq;
                        $this->updateItemInDB(
                            $oldElement->items[$index]
                        );
                    }
                    break;
                    
                case MyersDiff::DELETE:
                    print "Deleting item $index\n";
                    $this->itemsDataTable->deleteRow(
                        $oldElement->items[$index]->id
                    );
                    break;
                
                case MyersDiff::INSERT:
                    print "Insert item with seq $newSeq\n";
                    $this->createNewItemInDB(
                        $newElement->items[$index]
                    );
                    break;
            }
        }
        
        return $newElement->id;
    }
    
    public function deleteElement($elementId)
    {
        /**
         * Could there be a timing problem here? The deletes of element
         * and items will not have all the same valid_to value. There
         * might be problems if there's a query for elements for a time
         * right between those values (we're talking about 1/10th of a second
         * interval maybe)
         */
        $element = $this->getElementById($elementId);
        $res = $this->elementsDataTable->deleteRow($element->id);
        if ($res === false) {
            return false;
        }
        
        foreach ($element->items as $item) {
            $res2 = $this->itemsDataTable->deleteRow($item->id);
            if ($res2 === false) {
                return false;
            }
        }
        return true;
    }
    
   
 }