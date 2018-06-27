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
use AverroesProject\ColumnElement\ElementArray;
use DataTable\MySqlDataTable;
use DataTable\MySqlDataTableWithRandomIds;
use AverroesProject\Algorithm\MyersDiff;
use AverroesProject\Algorithm\Utility;
use AverroesProject\Plugin\HookManager;


use \PDO;

/**
 * @class AverroesProjectData
 * Provides access to data via helper functions.
 */
class DataManager 
{
    const MIN_USER_ID = 10000;
    const MAX_USER_ID = 100000;
    
    const ORDER_BY_PAGE_NUMBER = 100;
    const ORDER_BY_SEQ = 101;
    
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
     * @var DataTable\MySqlUnitemporalDataTable
     */
    private $pagesDataTable;
    
    /**
     *
     * @var Data\UserManager
     */
    public $um;
    
    
     /**
     *
     * @var DataTable\MySqlUnitemporalDataTable
     */
    private $docsDataTable;
    
    /**
     *
     * @var DataTable\MySqlUnitemporalDataTable
     */
    private $elementsDataTable;
    
    /**
     *
     * @var DataTable\MySqlUnitemporalDataTable 
     */
    private $itemsDataTable;
    
    
    /**
     *
     * @var DataTable\MySqlTable
     */
    private $pageTypesTable;
    
    /**
     *
     * @var DataTable\MySqlTable 
     */
    private $worksTable;
    
    public $queryStats;
    
    /**
     *
     * @var HookManager
     */
    public $hm;
    
    
    private $langCodes;
    /**
     * Tries to initialize and connect to the MySQL database.
     * 
     * Throws an error if there's no connection 
     * or if the database is not setup properly.
     */
    function __construct($dbConn, $tableNames, $logger, $hm, $langCodes = [])
    {
        $this->dbConn = $dbConn;
        $this->tNames = $tableNames;
        $this->logger = $logger;
        $this->hm = $hm;
        $this->langCodes = $langCodes;
        $this->queryStats = new QueryStats();
        
        $this->dbh = new MySqlHelper($dbConn, $logger);
        $this->enm = new EdNoteManager($dbConn, $this->dbh, $tableNames, 
                $logger);
        $this->um = new UserManager(
            new MySqlDataTable($dbConn, 
                    $tableNames['users']),
            new MySqlDataTable($dbConn, $tableNames['relations']), 
            new MySqlDataTableWithRandomIds($dbConn, 
                    $tableNames['people'], 
                    self::MIN_USER_ID, self::MAX_USER_ID), 
            new MySqlDataTable($dbConn, $tableNames['tokens']),
            $this->logger
        );
        
        $this->docsDataTable = new MySqlDataTable($this->dbConn, 
                $tableNames['docs']);
        $this->pageTypesTable = new MySqlDataTable($this->dbConn, 
                $tableNames['types_page']);
        $this->pagesDataTable = new \DataTable\MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['pages']);
        $this->elementsDataTable = new \DataTable\MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['elements']);
        $this->itemsDataTable = new \DataTable\MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['items']);
        $this->worksTable = new MySqlDataTable($this->dbConn, 
                $tableNames['works']);
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
        $this->queryStats->countQuery('select');
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
            'lang' => $lang, 
            'doc_type' => $type,
            'image_source' => $imageSource, 
            'image_source_data' => $imageSourceData
            ];
        
        $this->queryStats->countQuery('create');
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
            'img_number' => $pageNumber,
            'seq' => $pageNumber,
            'type' => $type,
            'lang' => $lang
            // foliation => defaults to null in DB
        ];
        
        $this->queryStats->countQuery('create');
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
        $this->queryStats->countQuery('select');
        $pageInfo = $this->pagesDataTable->getRow($pageId);
        $this->queryStats->countQuery('update');
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
        $this->queryStats->countQuery('select');
        $row = $this->pagesDataTable->getRow($pageId);
        if ($row === false) {
            return false;
        }
        // Sanitize types!
        $row['id'] = (int) $row['id'];
        $row['page_number'] = (int) $row['page_number'];
        $row['seq'] = (int) $row['seq'];
        $row['num_cols'] = (int) $row['num_cols'];
        return $row;
    }
    
    /**
     * Returns the number of pages of a document
     * @param type $docId
     * @return boolean|int
     */
    function getPageCountByDocId($docId)
    {
        $this->queryStats->countQuery('select');
        
        $query = 'SELECT COUNT(*) FROM ' . $this->tNames['pages'] . 
                ' WHERE `doc_id`=' . $docId . 
                ' AND `valid_until`=\'9999-12-31 23:59:59.999999\'';
        $res = $this->dbh->query($query);
        if ($res === false) {
            // This means a database error
            // Can't reproduce in testing for now
            return false; // @codeCoverageIgnore
        }
        return $res->fetch(PDO::FETCH_NUM)[0];
    }
    
    function getPageCountByDocIdAllTime($docId)
    {
        $this->queryStats->countQuery('select');
        
        $query = 'SELECT COUNT(*) FROM ' . $this->tNames['pages'] . 
                ' WHERE `doc_id`=' . $docId;
        $res = $this->dbh->query($query);
        if ($res === false) {
            // This means a database error
            // Can't reproduce in testing for now
            return false; // @codeCoverageIgnore
        }
        return (int) $res->fetch(PDO::FETCH_NUM)[0];
    }
    
    /**
     * Gets the page types table into an array
     */
    function getPageTypeNames()
    {
        $query = 'SELECT * FROM ' . $this->tNames['types_page'];
        $this->queryStats->countQuery('select');
        $res = $this->dbh->query($query);
        if ($res === false) {
            // This means a database error
            // Can't reproduce in testing for now
            return false; // @codeCoverageIgnore
        }
        return $res->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // TODO: fix maxChunk!
    public function getActiveWorks()
    {
         $query = 'SELECT dare_id, p.fullname, short_title FROM ' . $this->tNames['works'] . 
                 ' AS w JOIN (' . $this->tNames['people'] . ' AS p) ON (p.id=w.author_id) WHERE enabled=1' ;
        $this->queryStats->countQuery('select');
        $res = $this->dbh->query($query);
        if ($res === false) {
            // This means a database error
            // Can't reproduce in testing for now
            return false; // @codeCoverageIgnore
        }
        $data =  $res->fetchAll(PDO::FETCH_ASSOC);
        
        $theWorks = [];
        foreach($data as $work) {
            //$this->logger->debug('Work', $work);
            $theWorks[] =  [ 
                'title' => '(' . $work['dare_id'] . ') ' . $work['fullname'] . ' - ' . $work['short_title'], 
                'dareId' => $work['dare_id'], 
                'maxChunk' => 500
                ];
        }
        return $theWorks;

    }
    
    public function updateDocSettings($docId, $newSettings) 
    {
        $row['id'] = $docId;
        
        if ($newSettings === []) {
            return false;
        }
        
        if (isset($newSettings['title'])) {
            $row['title'] = trim($newSettings['title']);
            if ($row['title'] === '') {
                return false;
            }
        }
        
        if (isset($newSettings['short_title'])) {
            $row['short_title'] = trim($newSettings['short_title']);
        }
        
        if (isset($newSettings['lang'])) {
            $row['lang'] = $newSettings['lang'];
        }
        
        if (isset($newSettings['doc_type'])) {
            $row['doc_type'] = $newSettings['doc_type'];
        }
        
        if (isset($newSettings['image_source'])) {
            $row['image_source'] = $newSettings['image_source'];
        }
        
        if (isset($newSettings['image_source_data'])) {
            $row['image_source_data'] = trim($newSettings['image_source_data']);
        }
        
        if (count(array_keys($row)) === 1) {
            // this means that $settings did not have any
            // real setting, so there's nothing to do
            return true;
        }
        
        $this->queryStats->countQuery('update');
        return $this->docsDataTable->updateRow($row) === $docId;
    }
    
    /**
     * Updates the page settings: lang, foliation and type
     * 
     * Won't update anything else, e.g., num_cols, page_number, etc.
     * 
     * @param int $pageId
     * @param array $settings
     */
    function updatePageSettings($pageId, $settings) {
        $row['id'] = $pageId;
        
        if ($settings === []) {
            return false;
        }
        if (isset($settings['lang'])) {
            $row['lang'] = $settings['lang'];
        }
        if (isset($settings['foliation'])) {
            if ($settings['foliation'] == '') {
                $settings['foliation'] = NULL;
            }
            $row['foliation'] = $settings['foliation'];
        }
        
        if (isset($settings['type'])) {
            $row['type'] = $settings['type'];
            $typeInfo = $this->pageTypesTable->getRow($row['type']);
            if ($typeInfo === false) {
                return false;
            }
        }
        
        if (count(array_keys($row)) === 1) {
            // this means that $settings did not have any
            // real setting, so there's nothing to do
            return true;
        }
        
        $this->queryStats->countQuery('update');
        return $this->pagesDataTable->updateRow($row) === $pageId;
    }
    
    /**
     * Returns the number of lines with transcription for a document
     * @param type $docId
     * @return int
     */
    function getLineCountByDoc($docId){
        $this->queryStats->countQuery('select');
        return $this->dbh->getOneFieldQuery(
            'SELECT count(DISTINCT `page_id`, e.`seq`) as value from ' . 
                $this->tNames['elements'] . ' as e JOIN ' . 
                $this->tNames['pages'] . ' AS p ON e.page_id=p.id ' .
                ' WHERE p.doc_id=' . $docId . 
                ' AND e.type=' . Element::LINE . 
                " AND `e`.`valid_until`='9999-12-31 23:59:59.999999'", 
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
        
        $this->queryStats->countQuery('select');
        $query = "SELECT DISTINCT $tu.`id`" . 
            " FROM `$tu` JOIN (`$te`,  `$tp`)" . 
            " ON ($tu.id=$te.editor_id AND $tp.id=$te.page_id)" . 
            " WHERE $tp.doc_id=" . $docId . 
            " AND $tp.`valid_until`='9999-12-31 23:59:59.999999'" .
            " AND $te.`valid_until`='9999-12-31 23:59:59.999999'";
        
        $r = $this->dbh->query($query);
        
        $editors = [];
        while ($row = $r->fetch()) {
            $editors[] = $row['id'];
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
    function getTranscribedPageListByDocId($docId, $order = self::ORDER_BY_PAGE_NUMBER)
    {
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $orderby = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderby = 'seq';
        }
        
        $this->queryStats->countQuery('select');
        $query =  'SELECT DISTINCT p.`page_number` AS page_number FROM ' . 
                $tp . ' AS p' .
                ' JOIN ' . $te . ' AS e ON p.id=e.page_id' .
                ' WHERE p.doc_id=' . $docId . 
                " AND `e`.`valid_until`='9999-12-31 23:59:59.999999'" . 
                " AND `p`.`valid_until`='9999-12-31 23:59:59.999999'" . 
                " ORDER BY p.`$orderby` ASC";
        $r = $this->dbh->query($query);
        $pages = array();
         while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            array_push($pages, $row['page_number']);
        }
        return $pages;
    }
    
    
    /**
     *  Returns the page information for each page for the given $docId
     * 
     * @param int $docId
     * @return array
     */
    function getDocPageInfo($docId, $order = self::ORDER_BY_PAGE_NUMBER) {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];
        $this->queryStats->countQuery('select');
        
        $orderby = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderby = 'seq';
        }
        
        $query = "SELECT `$tp`.* FROM `$tp` JOIN `$td` " .
                 "ON (`$td`.id=`$tp`.doc_id) WHERE " . 
                 "`$tp`.`valid_until`='9999-12-31 23:59:59.999999' AND `$td`.id=$docId " . 
                 "ORDER BY `$tp`.$orderby ASC";
        $res = $this->dbh->query($query);
        
        return $res->fetchAll(PDO::FETCH_ASSOC);
    }
    
    function deleteDocById($docId) {
        $this->queryStats->countQuery('delete');
        if ($this->getPageCountByDocIdAllTime($docId) !== 0) {
            return false;
        }
        return $this->docsDataTable->deleteRow($docId);
    }
    /**
     * Returns the document information for the given document Id
     * @param type $docId
     * @return array
     */
    function getDocById($docId)
    {
        $this->queryStats->countQuery('select');
        return $this->dbh->getRowById($this->tNames['docs'], $docId);
    }
    
    function getDocByDareId($dareId) {
        $this->queryStats->countQuery('select');
        return $this->docsDataTable->findRow(['image_source_data' => $dareId]);
    }
    
    /**
     * Returns an array of document Ids for the documents
     * in which a user has done some transcription work
     * @param int $userId
     */
    public function getDocIdsTranscribedByUser(int $userId)
    {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];
        $te = $this->tNames['elements'];
        $eot = '9999-12-31 23:59:59.999999';
        
        $this->queryStats->countQuery('select');
        
        $query = "SELECT DISTINCT $td.id, $td.title FROM $td " . 
                 "JOIN ($te, $tp) ON ($te.page_id=$tp.id and $td.id=$tp.doc_id) " . 
                 "WHERE $te.editor_id=$userId " . 
                 "AND $te.valid_until='$eot' AND $tp.valid_until='$eot'" . 
                 "ORDER BY $td.title ASC";

        $res = $this->dbh->query($query);
        if ($res === false) {
            return [];
        }
        
        $docIds = [];
        while ($row = $res->fetch(PDO::FETCH_ASSOC)){
            $docIds[] = $row['id'];
        }
        return $docIds;
    }
    
    /**
     * Returns the page Ids transcribed by a user in a given document
     * 
     * @param int $userId
     * @param int $docId
     */
    public function getPageIdsTranscribedByUser(int $userId, int $docId) 
    {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];
        $te = $this->tNames['elements'];
        $eot = '9999-12-31 23:59:59.999999';
        
        $this->queryStats->countQuery('select');
        
        $query = "SELECT DISTINCT $tp.id, $tp.seq FROM $tp " . 
                 "JOIN ($td, $te) ON ($te.page_id=$tp.id and $td.id=$tp.doc_id) " . 
                 "WHERE $te.editor_id=$userId " . 
                 "AND $td.id=$docId " .
                 "AND $te.valid_until='$eot' AND $tp.valid_until='$eot' " . 
                 "ORDER BY $tp.seq ASC";

        $res = $this->dbh->query($query);
        if ($res === false) {
            return [];
        }
        
        $pageIds = [];
        while ($row = $res->fetch(PDO::FETCH_ASSOC)){
            $pageIds[] = $row['id'];
        }
        return $pageIds;
    }
    
    /**
     * Returns the image URL for a page or false if the page image source
     * is not recognized
     * @param int $docId
     * @param int $page
     * @return string|boolean
     */
    public function getImageUrl($docId, $imageNumber){
        $doc = $this->getDocById($docId);
        if ($doc === false) {
            return false;
        }
        
        $isd = $doc['image_source_data'];
        
        $url = $this->hm->callHookedMethods('get-image-url-' . $doc['image_source'],
                [ 'imageSourceData' => $isd, 
                   'imageNumber' => $imageNumber]);

        if (!is_string($url)) {
            return false;
        }
        
        return $url;
    }
    
    public function getOpenSeaDragonConfig($docId, $imageNumber){
        $doc = $this->getDocById($docId);
        if ($doc === false) {
            return false;
        }
        
        $isd = $doc['image_source_data'];
        
        $url = $this->hm->callHookedMethods('get-openseadragon-config-' . $doc['image_source'],
                [ 'imageSourceData' => $isd, 
                   'imageNumber' => $imageNumber]);

        if (!is_string($url)) {
            return false;
        }
        
        return $url;
    }
    
    
    public function getColumnElementsByPageId($pageId, $col) {
        $this->queryStats->countQuery('select');
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
    /**
     * 
     * @param string $docId
     * @param int $page
     * @param int $col
     * @return array of ColumnElement properly initialized
     */
    
    public function getColumnElements($docId, $page, $col){
        $pageId = $this->getPageIdByDocPage($docId, $page);
        if ($pageId === false) {
            // Non-existent page
            return [];
        }
        return $this->getColumnElementsByPageId($pageId, $col);
        
    }
    
    function getItemsForElement($element)
    {
        $this->queryStats->countQuery('select');
        $rows = $this->itemsDataTable->findRows([
            'ce_id' => $element->id
        ]);
        
        Utility::arraySortByKey($rows, 'seq');
        
        $tt=[];
        
        foreach ($rows as $row) {
            $item = self::createItemObjectFromRow($row);
            ItemArray::addItem($tt, $item, true);
        }
        return $tt;
    }
    
    public function getWorksWithTranscriptions()
    {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        
        $this->queryStats->countQuery('select');
        $query = "SELECT DISTINCT $ti.text " . 
            " FROM $ti " . 
            " JOIN $te ON ($ti.ce_id=$te.id) " .
            " WHERE $ti.type=" . Item::CHUNK_MARK . 
            " AND $ti.`valid_until`='9999-12-31 23:59:59.999999'" . 
            " AND $te.`valid_until`='9999-12-31 23:59:59.999999'" . 
            " ORDER BY $ti.text";
        
        $r = $this->dbh->query($query);
        
        $works = [];
        while ($row = $r->fetch()) {
            $works[] = $row['text'];
        }
        return $works;
    }
    
    
    /**
     *  Get data for a work
     * @param string $work
     * @return boolean
     */
    public function getWorkInfo($work)
    {
        $workInfo = $this->worksTable->findRow(['dare_id' => $work]);
        if ($workInfo === false) {
            return false;
        }
        
        $authorInfo = $this->um->getPersonInfo((int) $workInfo['author_id']);
        
        $workInfo['author_name'] = $authorInfo['fullname'];
        return $workInfo;
    }
    
    public function getChunksWithTranscriptionForWorkId($workId)
    {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        
        $this->queryStats->countQuery('select');
        $query = "SELECT DISTINCT $ti.target " . 
            " FROM $ti " . 
            " JOIN $te ON ($ti.ce_id=$te.id) " .
            " WHERE $ti.type=" . Item::CHUNK_MARK . 
            " AND $ti.text='" . $workId . "'"  . 
            " AND $ti.`valid_until`='9999-12-31 23:59:59.999999'" . 
            " AND $te.`valid_until`='9999-12-31 23:59:59.999999'" . 
            " ORDER BY $ti.target ASC";
        
        $r = $this->dbh->query($query);
        
        $chunks = [];
        while ($row = $r->fetch()) {
            $chunks[] = $row['target'];
        }
        return $chunks;
    }
    
    public function getDocsForChunk($workId, $chunkNumber)
    {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $td = $this->tNames['docs'];
        $tp = $this->tNames['pages'];
        
        $this->queryStats->countQuery('select');
        $query = "SELECT DISTINCT $td.* FROM $td" . 
                " JOIN ($te, $ti, $tp)" . 
                " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id AND $td.id=$tp.doc_id)" . 
                " WHERE $ti.type=" . Item::CHUNK_MARK .  
                " AND $ti.text='$workId'" . 
                " AND $ti.target=$chunkNumber" . 
                " AND $ti.valid_until='9999-12-31 23:59:59.999999'" . 
                " AND $te.valid_until='9999-12-31 23:59:59.999999'".
                " AND $tp.valid_until='9999-12-31 23:59:59.999999'";
        
        $r = $this->dbh->query($query);
        
        $docs = [];
        while ($row = $r->fetch()) {
            $docs[] = $row;
        }
        return $docs;
    }
    
    
    
    public function getChunkLocationsForDoc($docId, $workId, $chunkNumber) 
    {
        $locations = $this->getChunkLocationsForDocRaw($docId, $workId, $chunkNumber);
        return $this->getChunkLocationArrayFromRawLocations($locations);
    }
    
    /**
     * Returns a an array with the chunk start and end locations
     * for the given document, work and chunk numbers
     * 
     * Each row has the following fields:
     *  page_seq : page sequence number within the document
     *  foliation: page foliation
     *  column_number: column
     *  e_seq: element sequence number within the column
     *  item_seq: item sequence number within the element
     *  type: 'start' or 'end'
     *  segment: chunk segment number 
     * 
     * @param int $docId
     * @param string $workId
     * @param int $chunkNumber
     * @return array
     */
    public function getChunkLocationsForDocRaw($docId, $workId, $chunkNumber)
    {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $this->queryStats->countQuery('select');
        
        $query = "SELECT $tp.seq as 'page_seq'," .
            " $tp.foliation," . 
            " $te.column_number," . 
            " $te.seq as 'e_seq'," . 
            " $ti.seq as 'item_seq'," . 
            " $ti.alt_text as 'type'," . 
            " $ti.length as 'segment'" . 
            " FROM $tp" . 
            " JOIN ($te, $ti)" . 
            " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id)" . 
            " WHERE $ti.type=" . Item::CHUNK_MARK .  
            " AND $ti.text='$workId'" . 
            " AND $ti.target=$chunkNumber" . 
            " AND $tp.doc_id=$docId" . 
            " AND $ti.valid_until='9999-12-31 23:59:59.999999'" . 
            " AND $te.valid_until='9999-12-31 23:59:59.999999'" .
            " AND $tp.valid_until='9999-12-31 23:59:59.999999'" . 
            " ORDER BY $tp.seq, $te.column_number, $te.seq, $ti.seq ASC";;
        
        $r = $this->dbh->query($query);
        
        $rows = [];
        while ($row = $r->fetch()) {
            $rows[] = $row;
        }
        return $rows;
    }
    
    /**
     * Returns true if $loc1 represents
     * an item location that is located after
     * $loc2
     * 
     * 
     * 
     * @param array $loc1
     * @param array $loc2
     */
    private function isAfter($loc1, $loc2) 
    {
        
        $loc1Nr = $loc1['page_seq']*100000000 + 
            $loc1['column_number']*1000000 +
            $loc1['e_seq'] * 1000 + $loc1['item_seq'];
        
         $loc2Nr = $loc2['page_seq']*100000000 + 
            $loc2['column_number']*1000000 +
            $loc2['e_seq'] * 1000 + $loc2['item_seq'];
        
         return $loc1Nr > $loc2Nr;
    }
    
    /**
     * Returns an array containing the start and end locations
     * for every chunk segment in the given array of locations
     * ordered by segment
     * 
     * The given locations arrays is supposed to contain the 
     * locations for a single chunk in a particular documents
     * 
     * The returned array has the following structure:
     * 
     *   $results[n] = [ 'valid' => is_this_segment_valid (boolean)
     *                   'start' => start_location (or null)
     *                   'end' => end_location (or null),
     *                   'warnings' => array of string messages ]
     * 
     *  n = 0,1,2,... up to the number of segments found in the input array
     *  
     * 
     * @param array $locations
     */
    public function getChunkLocationArrayFromRawLocations($locations)
    {
        $cLocs = [];
        
        foreach($locations as &$location) {
            if (is_null($location['segment'])) {
                $location['segment'] = 1;
            }
            $segment = $location['segment'];
            
            if (is_null($location['foliation'])) {
                $location['foliation'] = $location['page_seq'];
            }
            if (!isset($cLocs[$segment])) {
                $cLocs[$segment] = [];
                $cLocs[$segment]['warnings'] = [];
                $cLocs[$segment]['valid'] = true;
            }
            if (isset($cLocs[$segment][$location['type']])) {
                // the location is already in the array, this is not good!
                $cLocs[$segment]['valid'] = false;
                $cLocs[$segment]['warnings'][] = 'Duplicate ' . 
                        $location['type'] . ' location found ';
                continue;
            }
            $cLocs[$segment][$location['type']] = $location;
        }
        
        foreach($cLocs as $key => &$segmentLoc) {
            if (!$segmentLoc['valid']) {
                continue;
            }
            if (!isset($segmentLoc['start'])) {
                $segmentLoc['valid'] = false;
                $segmentLoc['warnings'][] = 'No chunk segment start found for segment ' . $key;
                continue;
            }
            if (!isset($segmentLoc['end'])) {
                $segmentLoc['valid'] = false;
                $segmentLoc['warnings'][] = 'No chunk segment end found for segment ' . $key;
                continue;
            }
            if ($this->isAfter($segmentLoc['start'], $segmentLoc['end'])) {
                $segmentLoc['valid'] = false;
                $segmentLoc['warnings'][] = 'Chunk segment start is after chunk end in segment ' . $key;
            }
        }
        
        ksort($cLocs);
        return $cLocs;
    }
    
    public function getAdditionItemWithGivenTarget(int $target) {
        $ti = $this->tNames['items'];
        $this->queryStats->countQuery('select');
        
        $query = "SELECT * from $ti WHERE type=" . Item::ADDITION . " AND target=$target AND valid_until='9999-12-31 23:59:59.999999' LIMIT 1";
        $r = $this->dbh->query($query);
        
        return $r->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getAdditionElementIdWithGivenReference(int $reference) {
        $te = $this->tNames['elements'];
        $this->queryStats->countQuery('select');
        $query = "SELECT id from $te where type=" . Element::SUBSTITUTION . " AND reference=$reference AND valid_until='9999-12-31 23:59:59.999999' LIMIT 1";
        $r = $this->dbh->query($query);
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return (int) $row['id'];
        } 
        return false;
    }
            
    
    public function getItemStreamForElementId(int $elementId) {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $query = "SELECT $ti.id, $ti.type, $ti.seq, $ti.ce_id, $ti.lang, $ti.hand_id, $ti.text, $ti.alt_text, $ti.extra_info, $ti.length, $ti.target, " .
                "$te.type as 'e.type', $te.page_id, $te.column_number as col, $te.seq as 'e.seq', $te.hand_id as 'e.hand_id', $te.reference, $te.placement, " .
                "$tp.seq as 'p.seq', $tp.foliation" . 
            " FROM $ti" . 
            " JOIN ($te FORCE INDEX (page_id_2), $tp)" . 
            " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id)" . 
            " WHERE $te.id=$elementId" . 
            " AND $ti.valid_until='9999-12-31 23:59:59.999999'" . 
            " AND $te.valid_until='9999-12-31 23:59:59.999999'" .
            " AND $tp.valid_until='9999-12-31 23:59:59.999999'" . 
            " ORDER BY $ti.seq ASC";
        
        $r = $this->dbh->query($query);
        
        $rows = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $row;
        }
        return $rows;
    }
    
    public function calcSeqNumber($loc)
    {
        return $loc['page_seq']*1000000 + $loc['column_number'] * 10000 + $loc['e_seq']*100 + $loc['item_seq'];
    }
    
    /**
     * Returns an ordered list with the items between the given locations
     * but not including the items at the locations themselves.
     * 
     *  The list of items includes the text of all inline and marginal additions
     * at the appropriate places. That is, all references are resolved and the
     * returned list of items is the actual text between the given locations
     * 
     * @param int $docId
     * @param array $loc1
     * @param array $loc2
     * @return array
     */
    public function getItemStreamBetweenLocations($docId, $loc1, $loc2)
    {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $this->queryStats->countQuery('select');
        
        $seqNumberStart = $this->calcSeqNumber($loc1);
        $seqNumberEnd = $this->calcSeqNumber($loc2);
        if ($seqNumberStart >= $seqNumberEnd) {
            return [];
        }
        
        $query = "SELECT $ti.id, $ti.type, $ti.seq, $ti.ce_id, $ti.lang, $ti.hand_id, $ti.text, $ti.alt_text, $ti.extra_info, $ti.length, $ti.target, " .
                "$te.type as 'e.type', $te.page_id, $te.column_number as col, $te.seq as 'e.seq', $te.hand_id as 'e.hand_id', $te.reference, $te.placement, " .
                "$tp.seq as 'p.seq', $tp.foliation" . 
            " FROM $ti" . 
            " JOIN ($te FORCE INDEX (page_id_2), $tp)" . 
            " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id)" . 
            " WHERE $tp.doc_id=$docId" . 
            " AND $te.type=" . Element::LINE . 
            " AND ($tp.seq*1000000 + $te.column_number*10000 + $te.seq * 100 + $ti.seq) > $seqNumberStart" . 
            " AND ($tp.seq*1000000 + $te.column_number*10000 + $te.seq * 100 + $ti.seq) < $seqNumberEnd" .             
            " AND $ti.valid_until='9999-12-31 23:59:59.999999'" . 
            " AND $te.valid_until='9999-12-31 23:59:59.999999'" .
            " AND $tp.valid_until='9999-12-31 23:59:59.999999'" . 
            " ORDER BY $tp.seq, $te.column_number, $te.seq, $ti.seq ASC";
        
        $r = $this->dbh->query($query);
        
        $rows = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $row;
        }
        
        // Deal with targets and references
        $items = [];
        $additionItemsAlreadyInOutput = [];
        foreach($rows as $inputRow) {
            switch( (int) $inputRow['type']) {
                case Item::DELETION:
                case Item::UNCLEAR:
                case Item::MARGINAL_MARK:
                    $items[] = $inputRow;
                    $additionItem  = $this->getAdditionItemWithGivenTarget((int) $inputRow['id']);
                    if ($additionItem) {
                        $fieldsToCopy = ['e.type', 'page_id', 'col', 'e.seq', 'e.hand_id', 'reference', 'placement', 'p.seq', 'foliation'];
                        foreach ($fieldsToCopy as $field) {
                            $additionItem[$field] = $inputRow[$field];
                        }
                        $items[] = $additionItem;
                        $additionItemsAlreadyInOutput[] = (int) $additionItem['id'];
                    } else {
                        $additionElementId = $this->getAdditionElementIdWithGivenReference((int) $inputRow['id']);
                        if ($additionElementId) {
                            $additionElementItemStream = $this->getItemStreamForElementId($additionElementId);
                            foreach($additionElementItemStream as $additionItem) {
                                $items[] = $additionItem;
                            }
                        }
                    }
                    break;
                
                case Item::ADDITION:
                    if (!in_array((int)$inputRow['id'], $additionItemsAlreadyInOutput)) {
                        $items[] = $inputRow;
                    }
                    break;
                    
                default:
                    $items[] = $inputRow;
            }
        }
        return $items;
    }
    
    public function getPageIdByDocPage($docId, $pageNum)
    {
        $this->queryStats->countQuery('select');
        $row = $this->pagesDataTable->findRow([
            'doc_id' => $docId, 
            'page_number'=> $pageNum
            ]);
        if ($row === false) {
            return false;
        }
        return $row['id'];
    }
    
     public function getPageIdByDocSeq($docId, $seq)
    {
        $this->queryStats->countQuery('select');
        $row = $this->pagesDataTable->findRow([
            'doc_id' => $docId, 
            'seq'=> $seq
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
     * @param array $itemIds  new Item Ids (so that addition targets can be set)
     * @return Element
     */
    public function insertNewElement(Element $element, $insertAtEnd = true, $itemIds = []) 
    {
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
        
        if ($element->type !== Element::LINE_GAP && count($element->items) === 0) {
            $this->logger->error('Empty element being inserted', 
                    ['pageid' => $element->pageId, 
                        'colnum' => $element->columnNumber, 
                        'editor' => $element->editorId]);
            return false;
        }
        
        if (!in_array($element->lang, $this->langCodes)) {
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
        $this->logger->debug("New element Id = $newId, type = " . $newElement->type);
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
            // Check for addition targets
            if ($item->type === Item::ADDITION && $item->target) {
                if (!isset($itemIds[$item->target])) {
                    $this->logger->warning("Creating an Addition item with target Id not yet defined", get_object_vars($item));
                }
                $this->logger->debug("Setting addition target for new item: $item->target => " . $itemIds[$item->target]);
                $item->target = $itemIds[$item->target];
            }
            $newItemId = $this->createNewItemInDB($item);
            if ($newItemId === false ) {
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
            $itemIds[$item->id] = $newItemId;
        }
        return $this->getElementById($newId);
    }
        
    private function createNewItemInDB($item, $time = false) 
    {
        
        if (!$time) {
            $time = \DataTable\MySqlUnitemporalDataTable::now();
        }
        $this->queryStats->countQuery('create');
//        if ($item->type === Item::ADDITION) {
//            $this->logger->debug("Creating addition in db", get_object_vars($item));
//        }
        return $this->itemsDataTable->createRowWithTime([
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
        ], $time);
    }
    
    private function updateItemInDB($item, $time = false)
    {
        if (!$time) {
            $time = \DataTable\MySqlUnitemporalDataTable::now();
        }
        $this->queryStats->countQuery('update');
        return $this->itemsDataTable->realUpdateRowWithTime([
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
        ], $time);
    }
    private function createNewElementInDB($element) 
    {
        $this->queryStats->countQuery('create');
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
        $this->queryStats->countQuery('update');
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
       
        $te = $this->tNames['elements'];
        $this->queryStats->countQuery('select');
        $sql = "SELECT MAX(seq) as m FROM $te "
                . "WHERE page_id=$pageId AND column_number=$col " 
                . "AND `valid_until`='9999-12-31 23:59:59.999999'";
        $row = $this->dbh->getOneRow($sql);
        if (isset($row['m'])) {
            return (int) $row['m'];
        }
        return -1;
    }
    
    public  function getItemById($itemId)
    {
        $this->queryStats->countQuery('select');
        $row = $this->itemsDataTable->getRow($itemId);
         if ($row=== false) {
            return false;
        }
        return self::createItemObjectFromRow($row);
    }


    public function getElementById($elementId) {
        $this->queryStats->countQuery('select');
        $row = $this->elementsDataTable->getRow($elementId);
        
        if ($row=== false) {
            return false;
        }
        $e = $this->createElementObjectFromRow($row);
        $e->items = $this->getItemsForElement($e);
        return $e;
    }
    
    public static function createElementObjectFromArbitraryRow($fields, $row) {
        
        switch ($row[$fields['type']]){
            case Element::LINE:
                $e = new \AverroesProject\ColumnElement\Line();
                // the line number
                //$e->setLineNumber($row[$fields['reference']]);
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
            
            case Element::LINE_GAP:
                $e = new \AverroesProject\ColumnElement\LineGap();
                break;
            
            case Element::ADDITION:
                $e = new \AverroesProject\ColumnElement\Addition();
                break;
            
            case Element::PAGE_NUMBER:
                $e = new \AverroesProject\ColumnElement\PageNumber();
                break;
            
            case Element::SUBSTITUTION:
                $e = new \AverroesProject\ColumnElement\Substitution();
                break;

            default:
                continue;
        }
        $e->columnNumber = (int) $row[$fields['column_number']];
        $e->pageId = (int) $row[$fields['page_id']];
        $e->seq = (int) $row[$fields['seq']];
        $e->editorId = (int) $row[$fields['editor_id']];
        $e->handId = (int) $row[$fields['hand_id']];
        $e->id = (int) $row[$fields['id']];
        $e->lang = $row[$fields['lang']];
        $e->reference = (int) $row[$fields['reference']];
        $e->placement = $row[$fields['placement']];
        return $e;
    }
    
    /**
     * Creates an array of Element objects from an array such
     * as the one created by the TranscriptionEditor
     * @param type $theArray
     */
    public static function createElementArrayFromArray($theArray) {
        $elements = [];
        //print "Creating element array from array";
        foreach($theArray as $elementArray) {
            $e = self::createElementObjectFromArray($elementArray);
            $e->items = [];
            foreach($elementArray['items'] as $itemArray) {
                $item = self::createItemObjectFromArray($itemArray);
                $e->items[] = $item;
            }
            $elements[] = $e;
        }
        return $elements;
    }
    
    private function createElementObjectFromRow($row) 
    {
        $fields = [ 
            'id' => 'id',
            'type'=> 'type',
            'page_id' => 'page_id',
            'column_number' => 'column_number',
            'seq' => 'seq',
            'lang' => 'lang',
            'editor_id' => 'editor_id',
            'hand_id' => 'hand_id',
            'reference' => 'reference',
            'placement' => 'placement'
        ];
        return self::createElementObjectFromArbitraryRow($fields, $row);
    }
    
    public static function createElementObjectFromArray($theArray) 
    {
        $fields = [ 
            'id' => 'id',
            'type'=> 'type',
            'page_id' => 'pageId',
            'column_number' => 'columnNumber',
            'seq' => 'seq',
            'lang' => 'lang',
            'editor_id' => 'editorId',
            'hand_id' => 'handId',
            'reference' => 'reference',
            'placement' => 'placement'
        ];
        return self::createElementObjectFromArbitraryRow($fields, $theArray);
    }
    
    public static function createItemObjectFromArbitraryRow($fields, $row) {
        switch ($row[$fields['type']]){
            case Item::TEXT:
                $item = new \AverroesProject\TxText\Text($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;

            case Item::RUBRIC:
                $item = new \AverroesProject\TxText\Rubric($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;
            
            case Item::INITIAL:
                $item = new \AverroesProject\TxText\Initial($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;

            case Item::SIC:
                $item = new \AverroesProject\TxText\Sic($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']], 
                        $row[$fields['alt_text']]);
                break;

            case Item::MARK:
                $item = new \AverroesProject\TxText\Mark($row[$fields['id']], 
                        $row[$fields['seq']]);
                break;

            case Item::UNCLEAR:
                $item = new \AverroesProject\TxText\Unclear($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['extra_info']], 
                        $row[$fields['text']], 
                        $row[$fields['alt_text']]);
                break;

            case Item::ILLEGIBLE:
                $item = new \AverroesProject\TxText\Illegible($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['length']], 
                        $row[$fields['extra_info']]);
                break;

            case Item::ABBREVIATION:
                $item = new \AverroesProject\TxText\Abbreviation($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']], 
                        $row[$fields['alt_text']]);
                break;

            case Item::GLIPH:
                $item = new \AverroesProject\TxText\Gliph($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;

            case Item::DELETION:
                $item = new \AverroesProject\TxText\Deletion($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']], 
                        $row[$fields['extra_info']]);
                break;

            case Item::ADDITION:
                $item = new \AverroesProject\TxText\Addition($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']], 
                        $row[$fields['extra_info']], 
                        (int) $row[$fields['target']]);
                break;

            case Item::NO_WORD_BREAK:
                $item = new \AverroesProject\TxText\NoWordBreak($row[$fields['id']], 
                        $row[$fields['seq']]);
                break;
            
            case Item::CHUNK_MARK:
                if (!isset($row[$fields['length']])) {
                    $row[$fields['length']] = 1;
                }
                $item = new \AverroesProject\TxText\ChunkMark($row[$fields['id']],
                    $row[$fields['seq']], 
                    $row[$fields['text']], 
                    (int) $row[$fields['target']], 
                    $row[$fields['alt_text']], 
                    $row[$fields['length']]);
                break;
            
            case Item::CHARACTER_GAP:
                $item = new \AverroesProject\TxText\CharacterGap(
                        $row[$fields['id']], 
                        $row[$fields['seq']],
                        $row[$fields['length']]);
                break;
            
            case Item::PARAGRAPH_MARK:
                $item = new \AverroesProject\TxText\ParagraphMark($row[$fields['id']], 
                        $row[$fields['seq']]);
                break;
            
            case Item::MATH_TEXT:
                $item = new \AverroesProject\TxText\MathText($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;
            
            case Item::MARGINAL_MARK:
                $item = new \AverroesProject\TxText\MarginalMark($row[$fields['id']], 
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;

            default: 
                continue;
        }
        $item->lang = $row[$fields['lang']];
        $item->handId = $row[$fields['hand_id']];
        $item->setColumnElementId($row[$fields['ce_id']]);
        return $item;
    }
    
    public static function createItemObjectFromRow($row)
    {
        $fields = [ 
            'id' => 'id',
            'type'=> 'type',
            'ce_id' => 'ce_id',
            'seq' => 'seq',
            'lang' => 'lang',
            'hand_id' => 'hand_id',
            'text' => 'text',
            'alt_text' => 'alt_text',
            'extra_info' => 'extra_info',
            'length' => 'length',
            'target' => 'target',
        ];
        return self::createItemObjectFromArbitraryRow($fields, $row);
    }
    
    public static function createItemObjectFromArray($theArray)
    {
        $fields = [ 
            'id' => 'id',
            'type'=> 'type',
            'ce_id' => 'columnElementId',
            'seq' => 'seq',
            'lang' => 'lang',
            'hand_id' => 'handId',
            'text' => 'theText',
            'alt_text' => 'altText',
            'extra_info' => 'extraInfo',
            'length' => 'length',
            'target' => 'target',
        ];
        return self::createItemObjectFromArbitraryRow($fields, $theArray);
    }
    
    /**
     * Updates column elements in the database
     * 
     * @param array $newElements
     * @param array $oldElements
     */
    public function updateColumnElements($pageId, $columnNumber, array $newElements) 
    {
        $this->logger->debug("Updating column elements, pageId=$pageId, col=$columnNumber");
        // force pageId and columnNumber in the elements in $newElements
        foreach($newElements as $element ) {
            $element->pageId = $pageId;
            $element->columnNumber = $columnNumber;
        }
        //$this->logger->debug("The elements", $newElements);
        
        $oldElements = $this->getColumnElementsByPageId($pageId, $columnNumber);
        $editScript = ElementArray::getEditScript(
            $oldElements,
            $newElements
        );

        /**
         * ATTENTION: these instructions are supposed to happen simultaneously
         * but with this implementation they appear with different times in
         * the database. When versions are implemented in the UI, this will 
         * have to be fixed to avoid all these micro-changes appearing as 
         * different versions.
         */
        $newItemsIds = [];
        $newElementsIndex = 0;
        foreach ($editScript as $editInstruction) {
            list ($index, $cmd, $newSeq) = $editInstruction;
            switch ($cmd) {
                case MyersDiff::KEEP:
                    $this->logger->debug("KEEPING element @ pos " . $index . ", id=" . $oldElements[$index]->id);
                    if ($oldElements[$index]->seq 
                            !== $newSeq) {
                        $this->logger->debug("... with new seq $newSeq");
                        $this->logger->debug("... seq was " . $oldElements[$index]->seq );
                        $newElements[$newElementsIndex]->seq =
                                $newSeq;
                    }
                    if ($oldElements[$index]->type === Element::SUBSTITUTION || $oldElements[$index]->type === Element::ADDITION) {
                        $this->logger->debug("Keeping substitution/addition element");
                        if ($oldElements[$index]->reference !== 0) {
                            if (!isset($newItemsIds[$oldElements[$index]->reference])) {
                                $this->logger->warning('Found element without a valid target reference', get_object_vars($oldElements[$index]));
                            }
                            else {
                                if ($oldElements[$index]->reference !== $newItemsIds[$oldElements[$index]->reference]) {
                                    $this->logger->debug("... with new reference", 
                                            [ 'oldref' => $oldElements[$index]->reference, 'newref'=> $newItemsIds[$oldElements[$index]->reference] ]);
                                    $newElements[$index]->reference = $newItemsIds[$oldElements[$index]->reference];
                                }
                            }
                        }
                    }
                    list ($elementId, $ids) = $this->updateElement($newElements[$newElementsIndex], $oldElements[$index], $newItemsIds);
                    foreach($ids as $oldId => $newId) {
                        $newItemsIds[$oldId] = $newId;
                    }
                    $newElementsIndex++;
                    break;
                    
                case MyersDiff::DELETE:
                    $this->logger->debug("DELETING element @ " . $index . ", id=" . $oldElements[$index]->id);
                    $this->deleteElement($oldElements[$index]->id . "\n");
                    break;
                
                case MyersDiff::INSERT:
                    $this->logger->debug("INSERTING element @ " . $index);
                    $this->logger->debug("...New Seq: " . $newSeq);
                    $newElements[$newElementsIndex]->seq = $newSeq;
                    if ($newElements[$index]->type === Element::SUBSTITUTION || $newElements[$index]->type === Element::ADDITION) {
                        $this->logger->debug("...Inserting substitution/addition element");
                        if ($newElements[$index]->reference !== 0) {
                            if (!isset($newItemsIds[$newElements[$index]->reference])) {
                                $this->logger->warning('Found element without a valid target reference', get_object_vars($newElements[$index]));
                            }
                            else {
                                if ($newElements[$index]->reference !== $newItemsIds[$newElements[$index]->reference]) {
                                    $this->logger->debug("... with new reference", 
                                            [ 'oldref' => $newElements[$index]->reference, 'newref'=> $newItemsIds[$newElements[$index]->reference] ]);
                                    $newElements[$index]->reference = $newItemsIds[$newElements[$index]->reference];
                                }
                            }
                        } else {
                            $this->logger->debug("...with reference === 0");
                        }
                    }
                    $element = $this->insertNewElement($newElements[$newElementsIndex], false, $newItemsIds);
                    if ($element === false) {
                        $this->logger->error("Can't insert new element in DB", get_object_vars($newElements[$newElementsIndex]));
                        return false;
                    }
                    for ($j = 0; $j < count($newElements[$newElementsIndex]->items); $j++) {
                        $givenId = $newElements[$newElementsIndex]->items[$j]->id;
                        $newItemsIds[$givenId] = $element->items[$j]->id;
                    }
                    $this->logger->debug("...element id = " . $element->id);
                    $newElementsIndex++;
                    break;
            }
        }
        return $newItemsIds;
    }
    
    /**
     * Updates an element in the database. 
     * If there's a change in the element's data besides the items, the current
     * version in the DB will be updated.
     *
     * The items will be updated as necessary.
     *
     * Returns the id of the updated element and a list of 
     * ids for new items in the DB
     * 
     * @param Element $newElement
     */
    public function updateElement(Element $newElement, Element $oldElement, $itemIds = [])
    {
        // Force element IDs to be same, we're only dealing with the element's data
        if ($newElement->id !== $oldElement->id) {
                $newElement->id = $oldElement->id;
        }
        
        // Force columnElementId in new element's items
        foreach ($newElement->items as $item) {
            $item->columnElementId = $newElement->id;
        }
        
        $editScript = ItemArray::getEditScript(
            $oldElement->items,
            $newElement->items
        );
        $ignoreNewEditor = true;
        $now = \DataTable\MySqlUnitemporalDataTable::now();
        
        $newItemsIndex = 0;
        foreach ($editScript as $editInstruction) {
            list ($index, $cmd, $newSeq) = $editInstruction;
            switch ($cmd) {
                case MyersDiff::KEEP:
                    $this->logger->debug("Keeping item $index");
                    if ($oldElement->items[$index]->seq 
                            !== $newSeq) {
                        //print "... with new seq $newSeq\n";
                        $oldElement->items[$index]->seq =
                                $newSeq;
                        $this->updateItemInDB(
                            $oldElement->items[$index],
                            $now
                        );
                    }
                    
                    if ($oldElement->items[$index]->type === Item::ADDITION) {
                        $this->logger->debug("Keeping an addition",get_object_vars($oldElement->items[$index]));
                        if ($oldElement->items[$index]->target !== 0) {
                            $this->logger->debug("...with non-zero target", [ 'target'=>$oldElement->items[$index]->target]);
                            if (!isset($itemIds[$oldElement->items[$index]->target])) {
                                $this->logger->warning("Addition without valid target @ pos $index", get_object_vars($oldElement->items[$index]));
                            } 
                            else {
                                if ($oldElement->items[$index]->target !== $itemIds[$oldElement->items[$index]->target]) {
                                    $oldElement->items[$index]->target = $itemIds[$oldElement->items[$index]->target];
                                    $this->logger->debug("...with new target", [ 'target'=>$oldElement->items[$index]->target]);
                                    $this->updateItemInDB(
                                        $oldElement->items[$index],
                                        $now
                                    );
                                }
                            }
                        }
                    }
                    $itemIds[$newElement->items[$newItemsIndex]->id] = $oldElement->items[$index]->id;
                    $newItemsIndex++;
                    break;
                    
                case MyersDiff::DELETE:
                    $this->logger->debug("...deleting item @ pos $index");
                    $this->queryStats->countQuery('delete-item');
                    $this->itemsDataTable->deleteRowWithTime(
                        $oldElement->items[$index]->id,
                        $now
                    );
                    $ignoreNewEditor = false;
                    break;
                
                case MyersDiff::INSERT:
                    $this->logger->debug("...inserting item with seq $newSeq");
                    // This takes care of new addition with targets that
                    // come earlier in the item sequence in the same element,
                    // which is the most usual case
                    if ($newElement->items[$index]->type === Item::ADDITION && 
                            $newElement->items[$index]->target) {
                        if (!isset($itemIds[$newElement->items[$index]->target])) {
                            $this->logger->warning("Addition without valid target @ pos $index", get_object_vars($newElement->items[$index]));
                        } else {
                            $this->logger->debug("Setting addition target " . 
                                $newElement->items[$index]->target . 
                                " => " . 
                                $itemIds[$newElement->items[$index]->target]);
                            $newElement->items[$index]->target = 
                                $itemIds[$newElement->items[$index]->target];
                        }
                        
                    }
                    $newItemId = $this->createNewItemInDB(
                        $newElement->items[$index], 
                        $now
                    );
                    //print "...with item Id = ";
                    //var_dump($newItemId);
                    $itemIds[$newElement->items[$newItemsIndex]->id] = $newItemId;
                    $newItemsIndex++;
                    $ignoreNewEditor = false;
                    break;
            }
        }
        if (!$ignoreNewEditor && $newElement->editorId !== $oldElement->editorId) {
            $this->logger->debug('...changes by new editor!');
        }
        if (!Element::isElementDataEqual($newElement, $oldElement, true, $ignoreNewEditor, false)) {
            $this->logger->debug("...updating element in DB");
            $this->updateElementInDB($newElement);
        }
        
        return [$newElement->id, $itemIds];
        
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
        $this->queryStats->countQuery('delete');
        $res = $this->elementsDataTable->deleteRow($element->id);
        if ($res === false) {
            return false;
        }
        
        foreach ($element->items as $item) {
            $this->queryStats->countQuery('delete');
            $res2 = $this->itemsDataTable->deleteRow($item->id);
            if ($res2 === false) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Returns true if the given page does not any transcription data
     * associated with it
     * @param int $pageId
     */
    public function isPageEmpty($pageId) 
    {
        $pageInfo = $this->getPageInfo($pageId);
        if ($pageInfo['num_cols'] === 0) {
            return true;
        }
        for ($i = 1; $i <= $pageInfo['num_cols']; $i++) {
            $elements = $this->getColumnElementsByPageId($pageId, $i);
            if (count($elements) > 0) {
                return false;
            }
        }
        return true;
    }
    
    public function deletePage($docId, $pageNum) 
    {
        $pageId = $this->getPageIdByDocPage($docId, $pageNum);
        if (!$this->isPageEmpty($pageId)) {
            return false;
        }
        
        $deletedPageInfo = $this->getPageInfo($pageId);
        $deletedPageNum = $deletedPageInfo['page_number'];
        $deletedSeq = $deletedPageInfo['seq'];
        
        $docPageCount = $this->getPageCountByDocId($docId);

        // Update page number and sequence for the other pages
        for ($i = 1; $i <= $docPageCount; $i++) {
            $page = $this->getPageInfoByDocPage($docId, $i);
            $newPageNum = $page['page_number'];
            $newSeq = $page['seq'];
            if ($page['page_number'] > $deletedPageNum) {
                $newPageNum = $page['page_number'] - 1;
            }
            if ($page['seq'] > $deletedSeq) {
                $newSeq = $page['seq'] - 1;
            }
            if ($newPageNum != $page['page_number'] || $newSeq != $page['seq']) {
                $updateResult = $this->pagesDataTable->updateRow([
                    'id' => $page['id'],
                    'page_number' => $newPageNum,
                    'seq' => $newSeq
                ]);
                if ($updateResult !== $page['id']) {
                    // This means a database error
                    // Can't reproduce in testing for now
                    return false; // @codeCoverageIgnore 
                }
            }
        }
        
        // Delete page in pages table
        if (!$this->pagesDataTable->deleteRow($pageId)) {
            // This means a database error
            // Can't reproduce in testing for now
            return false; // @codeCoverageIgnore 
        }
        return true;
    }
 }