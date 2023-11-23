<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace AverroesProject\Data;

use APM\ToolBox\ArraySort;
use AverroesProject\ColumnElement\Custodes;
use AverroesProject\ColumnElement\Gloss;
use AverroesProject\ColumnElement\Head;
use AverroesProject\ColumnElement\Line;
use AverroesProject\ColumnElement\LineGap;
use AverroesProject\ColumnElement\PageNumber;
use AverroesProject\ColumnElement\Substitution;
use AverroesProject\TxText\Abbreviation;
use AverroesProject\TxText\Addition;
use AverroesProject\TxText\BoldText;
use AverroesProject\TxText\ChapterMark;
use AverroesProject\TxText\CharacterGap;
use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\Deletion;
use AverroesProject\TxText\Gliph;
use AverroesProject\TxText\Heading;
use AverroesProject\TxText\Illegible;
use AverroesProject\TxText\Initial;
use AverroesProject\TxText\Item;
use AverroesProject\TxText\ItemArray;
use AverroesProject\ColumnElement\Element;
use AverroesProject\ColumnElement\ElementArray;
use AverroesProject\TxText\MarginalMark;
use AverroesProject\TxText\Mark;
use AverroesProject\TxText\MathText;
use AverroesProject\TxText\NoWordBreak;
use AverroesProject\TxText\ParagraphMark;
use AverroesProject\TxText\Rubric;
use AverroesProject\TxText\Sic;
use AverroesProject\TxText\Text;
use AverroesProject\TxText\Unclear;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlDataTableWithRandomIds;
use APM\ToolBox\MyersDiff;
use APM\Plugin\HookManager;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;
use ThomasInstitut\TimeString\TimeString;
use Exception;
use Monolog\Logger;

use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use PDO;

/**
 * @class AverroesProjectData
 * Provides access to data via helper functions.
 */
class DataManager implements  SqlQueryCounterTrackerAware
{

    use SimpleSqlQueryCounterTrackerAware;

    const MIN_USER_ID = 10000;
    const MAX_USER_ID = 100000;
    
    const ORDER_BY_PAGE_NUMBER = 100;
    const ORDER_BY_SEQ = 101;

    // Witness Types
    const WITNESS_TRANSCRIPTION = 'transcription';
    const WITNESS_PLAINTEXT = 'plaintext';

    const VALID_WITNESS_TYPES = [ self::WITNESS_TRANSCRIPTION, self::WITNESS_PLAINTEXT];
    
    /**
     *
     * @var array
     * Array of table names
     */
    private array $tNames;
    /**
     *
     * @var PDO
     */
    private PDO $dbConn;
    /**
     *
     * @var Logger
     */
    private $logger;
    
    /**
     *
     * @var MySqlHelper
     */
    private MySqlHelper $databaseHelper;
    
    /**
     *
     * @var EdNoteManager 
     */
    public EdNoteManager $edNoteManager;

    /**
     *
     * @var MySqlUnitemporalDataTable
     */
    private MySqlUnitemporalDataTable $pagesDataTable;
    
    /**
     *
     * @var UserManager
     */
    public UserManager $userManager;
    
    
     /**
     *
     * @var MySqlUnitemporalDataTable
     */
    private $docsDataTable;
    
    /**
     *
     * @var MySqlUnitemporalDataTable
     */
    private MySqlUnitemporalDataTable $elementsDataTable;
    
    /**
     *
     * @var MySqlUnitemporalDataTable
     */
    private MySqlUnitemporalDataTable $itemsDataTable;
    
    
    /**
     *
     * @var MySqlDataTable
     */
    private MySqlDataTable $pageTypesTable;
    
    /**
     *
     * @var MySqlDataTable
     */
    private MySqlDataTable $worksTable;

    /**
     * @var MySqlDataTable
     */
    private MySqlDataTable $txVersionsTable;


    /**
     *
     * @var HookManager
     */
    public HookManager $hookManager;

    /**
     * @var array
     */
    private array $langCodes;

    /**
     * Tries to initialize and connect to the MySQL database.
     *
     * Throws an error if there's no connection
     * or if the database is not setup properly.
     * @param PDO $dbConn
     * @param array $tableNames
     * @param Logger $logger
     * @param HookManager $hm
     * @param array $langCodes
     */
    function __construct(PDO $dbConn, array $tableNames, Logger $logger, HookManager $hm, array $langCodes = [])
    {
        $this->dbConn = $dbConn;
        $this->tNames = $tableNames;
        $this->logger = $logger;
        $this->hookManager = $hm;
        $this->langCodes = $langCodes;

        $this->initSqlQueryCounterTracker();

        $this->databaseHelper = new MySqlHelper($dbConn, $logger);
        $this->edNoteManager = new EdNoteManager($dbConn, $this->databaseHelper, $tableNames,
                $logger);
        $this->userManager = new UserManager(
            new MySqlDataTable($dbConn, 
                    $tableNames['users']),
            new MySqlDataTable($dbConn, $tableNames['relations']), 
            new MySqlDataTableWithRandomIds($dbConn, 
                    $tableNames['people'], 
                    self::MIN_USER_ID, self::MAX_USER_ID), 
            new MySqlDataTable($dbConn, $tableNames['tokens'])
        );
        $this->userManager->setLogger($this->logger);
        
        $this->docsDataTable = new MySqlDataTable($this->dbConn, 
                $tableNames['docs']);
        $this->pageTypesTable = new MySqlDataTable($this->dbConn, 
                $tableNames['types_page']);
        $this->pagesDataTable = new MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['pages']);
        $this->elementsDataTable = new MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['elements']);
        $this->itemsDataTable = new MySqlUnitemporalDataTable(
                $this->dbConn, 
                $tableNames['items']);
        $this->worksTable = new MySqlDataTable($this->dbConn, 
                $tableNames['works']);

        $this->txVersionsTable = new MySqlDataTable($this->dbConn, $tableNames['versions_tx']);
    }

    /**
     * Returns an array with the IDs of all the manuscripts with
     * some data in the system and the number of pages with data
     *
     * @param string $order
     * @param bool $asc
     * @return array
     */
    public function getDocIdList($order = '', $asc=true): array
    {
        switch ($order){
            case 'title':
                $orderby = ' ORDER BY `title` ' . ($asc ? ' ASC' : ' DESC');
                break;
            
            default:
                $orderby = '';
        }
        $query = "SELECT `id` FROM  " . $this->tNames['docs'] . $orderby;
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $r = $this->databaseHelper->query($query);
        
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
        
        $this->getSqlQueryCounterTracker()->incrementCreate();
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
        

        $this->getSqlQueryCounterTracker()->incrementCreate();
        return $this->pagesDataTable->createRow($page);
    }
    
    /**
     * Returns the number of columns a given page
     * 
     * @param int $docId
     * @param int $page
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
     * @param int $docId
     * @param int $pageNumber
     * @return boolean
     */
    function addNewColumn($docId, $pageNumber)
    {
        $pageId = $this->getPageIdByDocPage($docId, $pageNumber);
        if ($pageId === false) {
            return false;
        }
        $this->getSqlQueryCounterTracker()->incrementSelect();
        try {
            $pageInfo = $this->pagesDataTable->getRow($pageId);
        } catch (Exception $e) {
            $this->reportException('addNewColumn, get row ' . $pageId, $e);
            return false;
        }

        $this->getSqlQueryCounterTracker()->incrementUpdate();
        try {
            $this->pagesDataTable->updateRow([
                'id' => $pageId,
                'num_cols' => $pageInfo['num_cols']+1
            ]);
        } catch (Exception $e) {
            $this->reportException('addNewColumn, updateRow ' . $pageId, $e);
            return false;
        }

        return true;
    }

    /**
     * Returns an associative array with the information about a page
     * @param int $docId
     * @param int $pageNumber
     * @return array|bool
     */
    function getPageInfoByDocPage(int $docId, int $pageNumber)
    {
        $id = $this->getPageIdByDocPage($docId, $pageNumber);
        if ($id === false) {
            return false;
        }
        return $this->getPageInfo($id);
    }


    /**
     * @param int $pageId
     * @return array|bool
     */
    public function getPageInfo(int $pageId)
    {
        $this->getSqlQueryCounterTracker()->incrementSelect();
        try {
            $row = $this->pagesDataTable->getRow($pageId);
        } catch (Exception $e) {
            $this->reportException('getPageInfo ' . $pageId, $e );
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
     * @param int $docId
     * @return boolean|int
     */
    function getPageCountByDocId($docId)
    {
        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $query = 'SELECT COUNT(*) FROM ' . $this->tNames['pages'] . 
                ' WHERE `doc_id`=' . $docId . 
                ' AND `valid_until`=\'9999-12-31 23:59:59.999999\'';
        $res = $this->databaseHelper->query($query);
        if ($res === false) {
            // This means a database error
            // Can't reproduce in testing for now
            return false; // @codeCoverageIgnore
        }
        return $res->fetch(PDO::FETCH_NUM)[0];
    }
    
    function getPageCountByDocIdAllTime($docId)
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $query = 'SELECT COUNT(*) FROM ' . $this->tNames['pages'] . 
                ' WHERE `doc_id`=' . $docId;
        $res = $this->databaseHelper->query($query);
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

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $res = $this->databaseHelper->query($query);
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

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $res = $this->databaseHelper->query($query);
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

        $this->getSqlQueryCounterTracker()->incrementUpdate();
        $this->docsDataTable->updateRow($row);
        return true;
    }

    /**
     * Updates the page settings: lang, foliation, type and seq
     *
     * Won't update anything else, e.g., num_cols, page_number, etc.
     *
     * @param int $pageId
     * @param array $settings
     * @return bool
     */
    function updatePageSettings(int $pageId, array $settings) : bool {
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
            try {
                $this->pageTypesTable->getRow($row['type']);
            } catch (Exception $e) {
                $this->reportException('updatePageSetting, get TypeInfo ' . $row['type'], $e);
                return false;
            }
            // so, the type is good, carry on
        }

        if (isset($settings['seq'])) {
            $row['seq'] = $settings['seq'];
        }
        
        if (count(array_keys($row)) === 1) {
            // this means that $settings did not have any
            // real setting, so there's nothing to do
            return true;
        }
        

        $this->getSqlQueryCounterTracker()->incrementUpdate();
        try {
            $this->pagesDataTable->updateRow($row);
        } catch (Exception $e) {
            $this->reportException('updatePageSetting, updateRow ' . $row['id'], $e);
            return false;
        }
        return true;
    }
    
    /**
     * Returns the editors associated with a document as a list of usernames
     * @param int $docId
     * @return array
     */
    function getEditorsByDocId(int $docId)
    {
        $te = $this->tNames['elements'];
        $tu = $this->tNames['users'];
        $tp = $this->tNames['pages'];


        $this->getSqlQueryCounterTracker()->incrementSelect();
        $query = "SELECT DISTINCT $tu.`id`" . 
            " FROM `$tu` JOIN (`$te`,  `$tp`)" . 
            " ON ($tu.id=$te.editor_id AND $tp.id=$te.page_id)" . 
            " WHERE $tp.doc_id=" . $docId . 
            " AND $tp.`valid_until`='9999-12-31 23:59:59.999999'" .
            " AND $te.`valid_until`='9999-12-31 23:59:59.999999'";
        
        $r = $this->databaseHelper->query($query);
        
        $editors = [];
        while ($row = $r->fetch()) {
            $editors[] = $row['id'];
        }
        return $editors;
    }

    /**
     * Returns the page numbers of the pages with transcription
     * data for a document Id
     * @param int $docId
     * @param int $order
     * @return array
     */
    function getTranscribedPageListByDocId(int $docId, $order = self::ORDER_BY_PAGE_NUMBER)
    {
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $orderby = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderby = 'seq';
        }


        $this->getSqlQueryCounterTracker()->incrementSelect();
        $query =  'SELECT DISTINCT p.`page_number` AS page_number FROM ' . 
                $tp . ' AS p' .
                ' JOIN ' . $te . ' AS e ON p.id=e.page_id' .
                ' WHERE p.doc_id=' . $docId . 
                " AND `e`.`valid_until`='9999-12-31 23:59:59.999999'" . 
                " AND `p`.`valid_until`='9999-12-31 23:59:59.999999'" . 
                " ORDER BY p.`$orderby`";
        $r = $this->databaseHelper->query($query);
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
     * @param int $order
     * @return array
     */
    function getDocPageInfo($docId, $order = self::ORDER_BY_PAGE_NUMBER) {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];

        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $orderby = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderby = 'seq';
        }
        
        $query = "SELECT `$tp`.* FROM `$tp` JOIN `$td` " .
                 "ON (`$td`.id=`$tp`.doc_id) WHERE " . 
                 "`$tp`.`valid_until`='9999-12-31 23:59:59.999999' AND `$td`.id=$docId " . 
                 "ORDER BY `$tp`.$orderby";
        $res = $this->databaseHelper->query($query);
        
        return $res->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @param $docId
     * @return bool|int
     * @throws Exception
     */
    function deleteDocById($docId) {
        $this->getSqlQueryCounterTracker()->incrementDelete();
        if ($this->getPageCountByDocIdAllTime($docId) !== 0) {
            return false;
        }
        return $this->docsDataTable->deleteRow($docId);
    }

    function getDocById($docId)
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        return $this->databaseHelper->getRowById($this->tNames['docs'], $docId);
    }
    
    function getDocByDareId($dareId) {

        $this->getSqlQueryCounterTracker()->incrementSelect();

        return $this->docsDataTable->findRows(['image_source_data' => $dareId], 1)[0];
    }

    /**
     * Returns an array of document Ids for the documents
     * in which a user has done some transcription work
     * @param int $userId
     * @return array
     */
    public function getDocIdsTranscribedByUser(int $userId) : array
    {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];
        $te = $this->tNames['elements'];
        $eot = '9999-12-31 23:59:59.999999';


        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $query = "SELECT DISTINCT $td.id, $td.title FROM $td " . 
                 "JOIN ($te, $tp) ON ($te.page_id=$tp.id and $td.id=$tp.doc_id) " . 
                 "WHERE $te.editor_id=$userId " . 
                 "AND $te.valid_until='$eot' AND $tp.valid_until='$eot'" . 
                 "ORDER BY $td.title";

        $res = $this->databaseHelper->query($query);
        if ($res === false) {
            return [];
        }
        
        $docIds = [];
        while ($row = $res->fetch(PDO::FETCH_ASSOC)){
            $docIds[] = intval($row['id']);
        }
        return $docIds;
    }

    /**
     * Returns the page Ids transcribed by a user in a given document
     *
     * @param int $userId
     * @param int $docId
     * @return array
     */
    public function getPageIdsTranscribedByUser(int $userId, int $docId) : array
    {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];
        $te = $this->tNames['elements'];
        $eot = '9999-12-31 23:59:59.999999';


        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $query = "SELECT DISTINCT $tp.id, $tp.seq FROM $tp " . 
                 "JOIN ($td, $te) ON ($te.page_id=$tp.id and $td.id=$tp.doc_id) " . 
                 "WHERE $te.editor_id=$userId " . 
                 "AND $td.id=$docId " .
                 "AND $te.valid_until='$eot' AND $tp.valid_until='$eot' " . 
                 "ORDER BY $tp.seq";

        $res = $this->databaseHelper->query($query);
        if ($res === false) {
            return [];
        }
        
        $pageIds = [];
        while ($row = $res->fetch(PDO::FETCH_ASSOC)){
            $pageIds[] = intval($row['id']);
        }
        return $pageIds;
    }

    /**
     * Returns the image URL for a page or false if the page image source
     * is not recognized
     * @param int $docId
     * @param int $imageNumber
     * @return string|boolean
     */
    public function getImageUrl($docId, int $imageNumber){
        $doc = $this->getDocById($docId);
        if ($doc === false) {
            return false;
        }
        
        $isd = $doc['image_source_data'];
        
        $url = $this->hookManager->callHookedMethods('get-image-url-' . $doc['image_source'],
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
        
        $url = $this->hookManager->callHookedMethods('get-openseadragon-config-' . $doc['image_source'],
                [ 'imageSourceData' => $isd, 
                   'imageNumber' => $imageNumber]);

        if (!is_string($url)) {
            return false;
        }
        
        return $url;
    }
    
    
    public function getColumnElementsByPageId($pageId, $col,$time = false) {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        if ($time === false) {
            $time = TimeString::now();
        }
        $rows = $this->elementsDataTable->findRowsWithTime([
            'page_id' => $pageId,
            'column_number' => $col
        ], 0, $time);

        ArraySort::byKey($rows, 'seq');


        $elements = [];
        foreach($rows as $row) {
            $e = $this->createElementObjectFromRow($row);
            $e->items = $this->getItemsForElement($e, $time);
            array_push($elements, $e);
        }
        return $elements;
    }

    /**
     *
     * @param string $docId
     * @param int $page
     * @param int $col
     * @param bool $time
     * @return array of ColumnElement properly initialized
     */
    
    public function getColumnElements($docId, $page, $col, $time = false){
        if ($time === false) {
            $time = TimeString::now();
        }
        //$this->logger->debug('Getting elements for time = ' . $time);
        $pageId = $this->getPageIdByDocPage($docId, $page);
        if ($pageId === false) {
            // Non-existent page
            return [];
        }
        return $this->getColumnElementsByPageId($pageId, $col, $time);
        
    }
    
    function getItemsForElement($element, $time = false)
    {
        if ($time === false) {
            $time = TimeString::now();
        }


        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->itemsDataTable->findRowsWithTime([
            'ce_id' => $element->id
        ], 0, $time);
        
        //Utility::arraySortByKey($rows, 'seq');
        ArraySort::byKey($rows, 'seq');
        
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


        $this->getSqlQueryCounterTracker()->incrementSelect();
        $query = "SELECT DISTINCT $ti.text " . 
            " FROM $ti " . 
            " JOIN $te ON ($ti.ce_id=$te.id) " .
            " WHERE $ti.type=" . Item::CHUNK_MARK . 
            " AND $ti.`valid_until`='9999-12-31 23:59:59.999999'" . 
            " AND $te.`valid_until`='9999-12-31 23:59:59.999999'" . 
            " ORDER BY $ti.text";
        
        $r = $this->databaseHelper->query($query);
        
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
        $rows = $this->worksTable->findRows(['dare_id' => $work], 1);
        if (count($rows)===0) {
            return false;
        }
        $workInfo = $rows[0];
        $authorInfo = $this->userManager->getPersonInfo((int) $workInfo['author_id']);
        
        $workInfo['author_name'] = $authorInfo['fullname'];
        return $workInfo;
    }

    /**
     * Gets an array of chunk Numbers with a transcription in the database for
     * the given work id
     *
     * @param $workId
     * @return string[]
     */
    public function getChunksWithTranscriptionForWorkId($workId) : array
    {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];


        $this->getSqlQueryCounterTracker()->incrementSelect();
        $query = "SELECT DISTINCT $ti.target " . 
            " FROM $ti " . 
            " JOIN $te ON ($ti.ce_id=$te.id) " .
            " WHERE $ti.type=" . Item::CHUNK_MARK . 
            " AND $ti.text='" . $workId . "'"  . 
            " AND $ti.`valid_until`='9999-12-31 23:59:59.999999'" . 
            " AND $te.`valid_until`='9999-12-31 23:59:59.999999'" . 
            " ORDER BY $ti.target";
        
        $r = $this->databaseHelper->query($query);
        
        $chunks = [];
        while ($row = $r->fetch()) {
            $chunks[] = intval($row['target']);
        }
        return $chunks;
    }

    /**
     * Returns a list of witnesses that include the given work and chunk numbers
     *
     * Each element of the resulting array contains two properties:
     *   type:  witness Type (e.g., 'transcription')
     *   id:   witness Id
     *
     * @param string $workId
     * @param int $chunkNumber
     * @return array
     */
    public function getWitnessesForChunk(string $workId, int $chunkNumber) : array {

        // Get transcriptions
        $transcriptionWitnesses = $this->getDocInfosForChunk($workId, $chunkNumber);

        // Get texts

        // Get other witness types

        // Assemble return array
        $witnessesForChunk = [];

        foreach($transcriptionWitnesses as $tw) {
            $witnessesForChunk[] =  [
                'type' => self::WITNESS_TRANSCRIPTION,
                'id' => $tw->id
            ];
        }
        return $witnessesForChunk;
    }

    /**
     * returns a list of docs
     *
     * @param string $workId
     * @param int $chunkNumber
     * @return array
     */
    public function getDocsForChunk(string $workId, int $chunkNumber) : array
    {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $td = $this->tNames['docs'];
        $tp = $this->tNames['pages'];


        $this->getSqlQueryCounterTracker()->incrementSelect();
        $query = "SELECT DISTINCT $td.* FROM $td" . 
                " JOIN ($te, $ti, $tp)" . 
                " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id AND $td.id=$tp.doc_id)" . 
                " WHERE $ti.type=" . Item::CHUNK_MARK .  
                " AND $ti.text='$workId'" . 
                " AND $ti.target=$chunkNumber" . 
                " AND $ti.valid_until='9999-12-31 23:59:59.999999'" . 
                " AND $te.valid_until='9999-12-31 23:59:59.999999'".
                " AND $tp.valid_until='9999-12-31 23:59:59.999999'";
        
        $r = $this->databaseHelper->query($query);
        
        $docs = [];
        while ($row = $r->fetch()) {
            $docs[] = $row;
        }
        return $docs;
    }

    /**
     * Returns an array of DocInfo structures corresponding to the documents in the
     * system whose transcription include some chunk mark for the given
     * workId and chunk number
     *
     * @param string $workId
     * @param int $chunkNumber
     * @return DocInfo[]
     */
    public function getDocInfosForChunk(string $workId, int $chunkNumber) : array {

        $docs = $this->getDocsForChunk($workId, $chunkNumber);

        $docInfos = [];

        foreach($docs as $row) {
            $docInfos[] = $this->createDocInfoFromDbRow($row);
        }

        return $docInfos;
    }


    /**
     * @param int $docId
     * @param string $workId
     * @param int $chunkNumber
     * @param string $localWitnessId
     * @return array
     */
//    public function getChunkLocationsForDoc(int $docId, string $workId, int $chunkNumber, string $localWitnessId = 'A') : array
//    {
//        $rawLocations = $this->getChunkLocationsForDocRaw($docId, $workId, $chunkNumber, $localWitnessId);
//
//        $locationArray = $this->getChunkLocationArrayFromRawLocations($rawLocations);
//
//        return $this->fillInColumnInfoForLocations($docId, $locationArray);
//    }

//    public function fillInColumnInfoForLocations(int $docId, array $locationArray) : array {
//
//        $returnArray = $locationArray;
//
//        // get columns for each location
//        foreach ($returnArray as $key => &$segmentLoc) {
//            $segmentLoc['columns'] = [];
//            if (!$segmentLoc['valid']) {
//                continue;
//            }
//            $startSeq = intval($segmentLoc['start']['page_seq']);
//            $startCol = intval($segmentLoc['start']['column_number']);
//            $endSeq = intval($segmentLoc['end']['page_seq']);
//            $endCol = intval($segmentLoc['end']['column_number']);
//            $pageInfo = $this->getPageInfoByDocSeq($docId, $startSeq);
//            $pageFoliation = is_null($pageInfo['foliation']) ? $pageInfo['seq'] : $pageInfo['foliation'];
//            if ($startSeq === $endSeq) {
//                for ($c = $startCol; $c <= $endCol; $c++) {
//                    $segmentLoc['columns'][] = [ 'pageId' => intval($pageInfo['id']), 'foliation' => $pageFoliation,  'column' => $c];
//                }
//                continue;
//            }
//            // more than 1 page
//            for ($c = $startCol; $c <= $pageInfo['num_cols']; $c++) {
//                $segmentLoc['columns'][] = [ 'pageId' => intval($pageInfo['id']), 'foliation' => $pageFoliation, 'column' => $c];
//            }
//            for ($pageSeq = $startSeq + 1; $pageSeq < $endSeq; $pageSeq++) {
//                $pageInfo = $this->getPageInfoByDocSeq($docId, $pageSeq);
//                $pageFoliation = is_null($pageInfo['foliation']) ? $pageInfo['seq'] : $pageInfo['foliation'];
//                for ($c = 1; $c <= $pageInfo['num_cols']; $c++) {
//                    $segmentLoc['columns'][] = [ 'pageId' => intval($pageInfo['id']), 'foliation' => $pageFoliation, 'column' => $c];
//                }
//            }
//            $pageInfo = $this->getPageInfoByDocSeq($docId, $endSeq);
//            $pageFoliation = is_null($pageInfo['foliation']) ? $pageInfo['seq'] : $pageInfo['foliation'];
//            for ($c = 1; $c <= $endCol; $c++) {
//                $segmentLoc['columns'][] = [ 'pageId' => intval($pageInfo['id']), 'foliation' => $pageFoliation,  'column' => $c];
//            }
//        }
//
//        $lastTime = '0000-00-00 00:00:00.000000';  // times will be compared as strings, this works because MySQL stores times as 'YYYY-MM-DD HH:MM:SS.mmmmmmm'
//        $lastAuthorName = '';
//        $lastAuthorId = 0;
//        $lastAuthorUsername = '';
//        foreach($returnArray as $key => &$segmentLoc) {
//            foreach($segmentLoc['columns'] as &$column) {
//                $column['versions'] = $this->getTranscriptionVersionsWithAuthorInfo($column['pageId'], $column['column']);
//                if (count($column['versions']) > 0) {
//                    $lastVersionTime = $column['versions'][count($column['versions'])-1]['time_from'];
//                    $column['lastTime'] = $lastVersionTime;
//                    $column['lastAuthorName'] = $column['versions'][count($column['versions'])-1]['author_name'];
//                    $column['lastAuthorId'] = intval($column['versions'][count($column['versions'])-1]['author_id']);
//                    $column['lastAuthorUsername'] = $column['versions'][count($column['versions'])-1]['author_username'];
//                    if (strcmp($lastTime, $lastVersionTime)<0) {
//                        $lastTime = $lastVersionTime;
//                        $lastAuthorName = $column['lastAuthorName'];
//                        $lastAuthorId = $column['lastAuthorId'];
//                        $lastAuthorUsername =$column['lastAuthorUsername'];
//                    }
//                } else {
//                    $column['lastTime'] = '0000-00-00 00:00:00.000000';
//                    $column['lastAuthorName'] = 'nobody';
//                    $column['lastAuthorId'] = 0;
//                    $column['lastAuthorUsername'] = 'nobody';
//                }
//            }
//            $segmentLoc['lastTime'] = $lastTime;
//            $segmentLoc['lastAuthorName'] = $lastAuthorName;
//            $segmentLoc['lastAuthorId'] = $lastAuthorId;
//            $segmentLoc['lastAuthorUsername'] = $lastAuthorUsername;
//        }
//
//        return $returnArray;
//
//    }

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
     * @param string $localWitnessId
     * @param string $timeString
     * @return array
     */
//    public function getChunkLocationsForDocRaw($docId, $workId, $chunkNumber, $localWitnessId = 'A', $timeString = '')
//    {
//        $ti = $this->tNames['items'];
//        $te = $this->tNames['elements'];
//        $tp = $this->tNames['pages'];
//
//        if ($timeString === '') {
//            $timeString = TimeString::now();
//        }
//
//
//        $this->getSqlQueryCounterTracker()->incrementSelect();
//
//        $query = "SELECT $tp.seq as 'page_seq'," .
//            " $tp.foliation," .
//            " $te.column_number," .
//            " $te.seq as 'e_seq'," .
//            " $ti.seq as 'item_seq'," .
//            " $ti.alt_text as 'type'," .
//            " $ti.extra_info as 'lwid'," .
//            " $ti.length as 'segment'" .
//            " FROM $tp" .
//            " JOIN ($te, $ti)" .
//            " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id)" .
//            " WHERE $ti.type=" . Item::CHUNK_MARK .
//            " AND $ti.text='$workId'" .
//            " AND $ti.target=$chunkNumber" .
//            " AND $ti.extra_info='$localWitnessId'" .
//            " AND $tp.doc_id=$docId" .
//            " AND $ti.valid_from<='$timeString'" .
//            " AND $te.valid_from<='$timeString'" .
//            " AND $tp.valid_from<='$timeString'" .
//            " AND $ti.valid_until>'$timeString'" .
//            " AND $te.valid_until>'$timeString'" .
//            " AND $tp.valid_until>'$timeString'" .
////            " AND $ti.valid_until='9999-12-31 23:59:59.999999'" .
////            " AND $te.valid_until='9999-12-31 23:59:59.999999'" .
////            " AND $tp.valid_until='9999-12-31 23:59:59.999999'" .
//            " ORDER BY $tp.seq, $te.column_number, $te.seq, $ti.seq ASC";
//
//        $r = $this->databaseHelper->query($query);
//
//        $rows = [];
//        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
//            $rows[] = $row;
//        }
//        $this->logger->debug("ChunkLocations for doc $docId, work $workId, chunk $chunkNumber, lwid $localWitnessId", $rows);
//        return $rows;
//    }

    /**
     * Returns true if $loc1 represents
     * an item location that is located after
     * $loc2
     *
     *
     *
     * @param array $loc1
     * @param array $loc2
     * @return bool
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
     * locations for a single chunk in a particular document
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
     * @param array $locationRows
     * @return array
     */
    public function getChunkLocationArrayFromRawLocations($locationRows)
    {
        $chunkLocations = [];
        
        foreach($locationRows as &$locationRow) {
            if (is_null($locationRow['segment'])) {
                $locationRow['segment'] = 1;
            }
            $chunkSegment = $locationRow['segment'];
            
            if (is_null($locationRow['foliation'])) {
                $locationRow['foliation'] = $locationRow['page_seq'];
            }
            if (!isset($chunkLocations[$chunkSegment])) {
                $chunkLocations[$chunkSegment] = [];
                $chunkLocations[$chunkSegment]['warnings'] = [];
                $chunkLocations[$chunkSegment]['valid'] = true;
            }
            if (isset($chunkLocations[$chunkSegment][$locationRow['type']])) {
                // the location is already in the array, this is not good!
                $chunkLocations[$chunkSegment]['valid'] = false;
                $chunkLocations[$chunkSegment]['warnings'][] = 'Duplicate ' . 
                        $locationRow['type'] . ' location found ';
                continue;
            }
            $chunkLocations[$chunkSegment][$locationRow['type']] = $locationRow;
        }

        // check for other inconsistencies
        foreach($chunkLocations as $key => &$segmentLoc) {
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
        
        ksort($chunkLocations);


        return $chunkLocations;
    }
    
    public function getAdditionItemWithGivenTarget(int $target) {
        $ti = $this->tNames['items'];

        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $query = "SELECT * from $ti WHERE type=" . Item::ADDITION . " AND target=$target AND valid_until='9999-12-31 23:59:59.999999' LIMIT 1";
        $r = $this->databaseHelper->query($query);
        
        return $r->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getAdditionElementIdWithGivenReference(int $reference) {
        $te = $this->tNames['elements'];

        $query = "SELECT id from $te where type=" . Element::SUBSTITUTION . " AND reference=$reference AND valid_until='9999-12-31 23:59:59.999999' LIMIT 1";
        $r = $this->databaseHelper->query($query);
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

        $this->getSqlQueryCounterTracker()->incrementSelect();
        
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
        
        $r = $this->databaseHelper->query($query);
        
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


        $this->getSqlQueryCounterTracker()->incrementSelect();
        
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
        
        $r = $this->databaseHelper->query($query);
        
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

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId, 
            'page_number'=> $pageNum
            ],1);
        if ($rows === []) {
            return false;
        }
        return $rows[0]['id'];
    }
    
     public function getPageIdByDocSeq($docId, $seq)
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId, 
            'seq'=> $seq
            ],1);
        if ($rows === []) {
            return false;
        }
        return $rows[0]['id'];
    }

    /**
     * Gets page information from the database for the given doc and sequences
     * If there's an error, it returns false. Otherwise it returns an array with
     * the following fields:
     *   id
     *   doc_id
     *   page_number
     *   img_number
     *   seq
     *   type
     *   lang
     *   num_cols
     *   foliation  (a string or null)
     * @param $docId
     * @param $seq
     * @return bool|array
     */
    public function getPageInfoByDocSeq($docId, $seq) {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId,
            'seq'=> $seq
        ],1);
        if ($rows === []) {
            return false;
        }
        return $rows[0];
    }

    public function getPageFoliationByDocSeq(int $docId, int $pageSeq) : string {
        $info = $this->getPageInfoByDocSeq($docId, $pageSeq);
        if (is_null($info['foliation'])) {
            return $info['page_number'];
        }
        return $info['foliation'];
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
     * @param array $itemIds new Item Ids (so that addition targets can be set)
     * @param bool $time
     * @return bool|Element
     */
    public function insertNewElement(Element $element, $insertAtEnd = true, $itemIds = [], $time = false) 
    {
        
        if (!$time) {
            $time = TimeString::now();
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
        
        if (!$this->userManager->userExistsById($element->editorId)) {
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
                    $this->updateElementInDB($cElement, $time);
                }
            }
        }
        // Now just create the new element
        $newId = $this->createNewElementInDB($newElement, $time);
//        $this->logger->debug("New element Id = $newId, type = " . $newElement->type);
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
//                $this->logger->debug("Setting addition target for new item: $item->target => " . $itemIds[$item->target]);
                $item->target = $itemIds[$item->target];
            }
            $newItemId = $this->createNewItemInDB($item, $time);
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
            $time = TimeString::now();
        }
        $this->getSqlQueryCounterTracker()->incrementCreate();
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
            $time = TimeString::now();
        }

        $this->getSqlQueryCounterTracker()->incrementUpdate();
        $this->itemsDataTable->realUpdateRowWithTime([
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
        return true;
    }
    private function createNewElementInDB($element, $time = false) 
    {
         if (!$time) {
            $time = TimeString::now();
        }
        $this->getSqlQueryCounterTracker()->incrementCreate();
        return $this->elementsDataTable->createRowWithTime([
                'type' => $element->type,
                'page_id' => $element->pageId,
                'column_number' => $element->columnNumber,
                'seq' => $element->seq,
                'lang' => $element->lang,
                'editor_id' => $element->editorId,
                'hand_id' => $element->handId,
                'reference' => $element->reference,
                'placement' => $element->placement
            ], $time);
    }
    
    private function updateElementInDB($element,  $time = false) 
    {
        if (!$time) {
            $time = TimeString::now();
        }

        $this->getSqlQueryCounterTracker()->incrementUpdate();
        $this->elementsDataTable->realUpdateRowWithTime([
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
            ], $time);
        return true;
    }
    
       
    private function getMaxElementSeq($pageId, $col)
    {
       
        $te = $this->tNames['elements'];

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $sql = "SELECT MAX(seq) as m FROM $te "
                . "WHERE page_id=$pageId AND column_number=$col " 
                . "AND `valid_until`='9999-12-31 23:59:59.999999'";
        $row = $this->databaseHelper->getOneRow($sql);
        if (isset($row['m'])) {
            return (int) $row['m'];
        }
        return -1;
    }
    
    public function getItemById($itemId)
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        try {
            $row = $this->itemsDataTable->getRow($itemId);
        } catch(Exception $e) {
            $this->reportException('getItemById ' . $itemId, $e);
            return false;
        }

        return self::createItemObjectFromRow($row);
    }


    public function getElementById($elementId) {

        $this->getSqlQueryCounterTracker()->incrementSelect();

        $row = false;
        try {
            $row = $this->elementsDataTable->getRow($elementId);
        } catch (Exception $e) {
            $this->reportException('getElementById, getRow ' . $elementId, $e);
        }
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
                $e = new Line();
                // the line number
                //$e->setLineNumber($row[$fields['reference']]);
                break;

            case Element::CUSTODES:
                $e = new Custodes();
                break;

            case Element::HEAD:
                $e = new Head();
                break;

            case Element::GLOSS:
                $e = new Gloss();
                break;
            
            case Element::LINE_GAP:
                $e = new LineGap();
                break;
            
            case Element::ADDITION:
                $e = new \AverroesProject\ColumnElement\Addition();
                break;
            
            case Element::PAGE_NUMBER:
                $e = new PageNumber();
                break;
            
            case Element::SUBSTITUTION:
                $e = new Substitution();
                break;

//            default:
//                continue;
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
     * @param array $theArray
     * @return array
     */
    public static function createElementArrayFromArray(array $theArray) {
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
                $item = new Text($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;

            case Item::RUBRIC:
                $item = new Rubric($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;
            
            case Item::INITIAL:
                $item = new Initial($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;

            case Item::SIC:
                $item = new Sic($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']], 
                        $row[$fields['alt_text']]);
                break;

            case Item::MARK:
                $item = new Mark($row[$fields['id']],
                        $row[$fields['seq']]);
                break;

            case Item::UNCLEAR:
                $item = new Unclear($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['extra_info']], 
                        $row[$fields['text']], 
                        $row[$fields['alt_text']]);
                break;

            case Item::ILLEGIBLE:
                $item = new Illegible($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['length']], 
                        $row[$fields['extra_info']]);
                break;

            case Item::ABBREVIATION:
                $item = new Abbreviation($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']], 
                        $row[$fields['alt_text']]);
                break;

            case Item::GLIPH:
                $item = new Gliph($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;

            case Item::DELETION:
                $item = new Deletion($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']], 
                        $row[$fields['extra_info']]);
                break;

            case Item::ADDITION:
                $item = new Addition($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']], 
                        $row[$fields['extra_info']], 
                        (int) $row[$fields['target']]);
                break;

            case Item::NO_WORD_BREAK:
                $item = new NoWordBreak($row[$fields['id']],
                        $row[$fields['seq']]);
                break;
            
            case Item::CHUNK_MARK:
                if (!isset($row[$fields['length']])) {
                    $row[$fields['length']] = 1;
                }
                $item = new ChunkMark($row[$fields['id']],
                    $row[$fields['seq']], 
                    $row[$fields['text']], 
                    (int) $row[$fields['target']], 
                    $row[$fields['alt_text']],
                    $row[$fields['extra_info']],
                    $row[$fields['length']]);
                break;

            case Item::CHAPTER_MARK:
                $textFields = explode(ChapterMark::SEPARATOR, $row[$fields['text']]);
                $appellation = $textFields[0];
                $title = $textFields[1];
                $item = new ChapterMark(
                    $row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['extra_info']],
                    (int) $row[$fields['target']],
                    $row[$fields['alt_text']],
                    $appellation,
                    $title,
                    $row[$fields['length']]
                );
                break;
            
            case Item::CHARACTER_GAP:
                $item = new CharacterGap(
                        $row[$fields['id']], 
                        $row[$fields['seq']],
                        $row[$fields['length']]);
                break;
            
            case Item::PARAGRAPH_MARK:
                $item = new ParagraphMark($row[$fields['id']],
                        $row[$fields['seq']]);
                break;
            
            case Item::MATH_TEXT:
                $item = new MathText($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;
            
            case Item::MARGINAL_MARK:
                $item = new MarginalMark($row[$fields['id']],
                        $row[$fields['seq']], 
                        $row[$fields['text']]);
                break;

            case Item::BOLD_TEXT:
                $item = new BoldText($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);
                break;

            case Item::HEADING:
                $item = new Heading($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);


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
     * @param $pageId
     * @param $columnNumber
     * @param array $newElements
     * @param bool $time
     * @return array|bool
     * @throws Exception
     */
    public function updateColumnElements($pageId, $columnNumber, array $newElements, $time = false)
    {
//        $this->logger->debug("Updating column elements, pageId=$pageId, col=$columnNumber");
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

        if ($time === false) {
            $time = TimeString::now();
        }
        $newItemsIds = [];
        $newElementsIndex = 0;
        foreach ($editScript as $editInstruction) {
            list ($index, $cmd, $newSeq) = $editInstruction;
            switch ($cmd) {
                case MyersDiff::KEEP:
//                    $this->logger->debug("KEEPING element @ pos " . $index . ", id=" . $oldElements[$index]->id);
                    if ($oldElements[$index]->seq 
                            !== $newSeq) {
//                        $this->logger->debug("... with new seq $newSeq");
//                        $this->logger->debug("... seq was " . $oldElements[$index]->seq );
                        $newElements[$newElementsIndex]->seq =
                                $newSeq;
                    }
                    if ($oldElements[$index]->type === Element::SUBSTITUTION || $oldElements[$index]->type === Element::ADDITION) {
//                        $this->logger->debug("Keeping substitution/addition element");
                        if ($oldElements[$index]->reference !== 0) {
                            if (!isset($newItemsIds[$oldElements[$index]->reference])) {
                                $this->logger->warning('Found element without a valid target reference', get_object_vars($oldElements[$index]));
                            }
                            else {
                                if ($oldElements[$index]->reference !== $newItemsIds[$oldElements[$index]->reference]) {
//                                    $this->logger->debug("... with new reference",
//                                            [ 'oldref' => $oldElements[$index]->reference, 'newref'=> $newItemsIds[$oldElements[$index]->reference] ]);
                                    $newElements[$index]->reference = $newItemsIds[$oldElements[$index]->reference];
                                }
                            }
                        }
                    }
                    list ($elementId, $ids) = $this->updateElement($newElements[$newElementsIndex], $oldElements[$index], $newItemsIds, $time);
                    foreach($ids as $oldId => $newId) {
                        $newItemsIds[$oldId] = $newId;
                    }
                    $newElementsIndex++;
                    break;
                    
                case MyersDiff::DELETE:
//                    $this->logger->debug("DELETING element @ " . $index . ", id=" . $oldElements[$index]->id);
//                    $this->logger->debug("... .... time=" . $time);
                    $this->deleteElement($oldElements[$index]->id, $time);
                    break;
                
                case MyersDiff::INSERT:
//                    $this->logger->debug("INSERTING element @ " . $index);
//                    $this->logger->debug("...New Seq: " . $newSeq);
                    $newElements[$newElementsIndex]->seq = $newSeq;
                    if ($newElements[$index]->type === Element::SUBSTITUTION || $newElements[$index]->type === Element::ADDITION) {
//                        $this->logger->debug("...Inserting substitution/addition element");
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
                            // nothing to do really!
//                            $this->logger->debug("...with reference === 0");
                        }
                    }
//                    $this->logger->debug("... .... time=" . $time);
                    $element = $this->insertNewElement($newElements[$newElementsIndex], false, $newItemsIds, $time);
                    if ($element === false) {
                        $this->logger->error("Can't insert new element in DB", get_object_vars($newElements[$newElementsIndex]));
                        return false;
                    }
                    for ($j = 0; $j < count($newElements[$newElementsIndex]->items); $j++) {
                        $givenId = $newElements[$newElementsIndex]->items[$j]->id;
                        $newItemsIds[$givenId] = $element->items[$j]->id;
                    }
//                    $this->logger->debug("...element id = " . $element->id);
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
     * @param Element $oldElement
     * @param array $itemIds
     * @param bool $time
     * @return array
     * @throws Exception
     */
    public function updateElement(Element $newElement, Element $oldElement, $itemIds = [], $time = false)
    {
        if (!$time) {
            $time = TimeString::now();
        }
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
        
        
        $newItemsIndex = 0;
        foreach ($editScript as $editInstruction) {
            list ($index, $cmd, $newSeq) = $editInstruction;
            switch ($cmd) {
                case MyersDiff::KEEP:
//                    $this->logger->debug("Keeping item $index");
                    if ($oldElement->items[$index]->seq 
                            !== $newSeq) {
                        //print "... with new seq $newSeq\n";
                        $oldElement->items[$index]->seq =
                                $newSeq;
                        $this->updateItemInDB(
                            $oldElement->items[$index],
                            $time
                        );
                    }
                    
                    if ($oldElement->items[$index]->type === Item::ADDITION) {
//                        $this->logger->debug("Keeping an addition",get_object_vars($oldElement->items[$index]));
                        if ($oldElement->items[$index]->target !== 0) {
//                            $this->logger->debug("...with non-zero target", [ 'target'=>$oldElement->items[$index]->target]);
                            if (!isset($itemIds[$oldElement->items[$index]->target])) {
                                $this->logger->warning("Addition without valid target @ pos $index", get_object_vars($oldElement->items[$index]));
                            } 
                            else {
                                if ($oldElement->items[$index]->target !== $itemIds[$oldElement->items[$index]->target]) {
                                    $oldElement->items[$index]->target = $itemIds[$oldElement->items[$index]->target];
//                                    $this->logger->debug("...with new target", [ 'target'=>$oldElement->items[$index]->target]);
//                                    $this->logger->debug("... .... time=" . $time);
                                    $this->updateItemInDB(
                                        $oldElement->items[$index],
                                        $time
                                    );
                                }
                            }
                        }
                    }
                    $itemIds[$newElement->items[$newItemsIndex]->id] = $oldElement->items[$index]->id;
                    $newItemsIndex++;
                    break;
                    
                case MyersDiff::DELETE:
//                    $this->logger->debug("...deleting item @ pos $index");
                    $this->getSqlQueryCounterTracker()->incrementDelete();
//                    $this->logger->debug("... .... time=" . $time);
                    $this->itemsDataTable->deleteRowWithTime(
                        $oldElement->items[$index]->id,
                        $time
                    );
                    $ignoreNewEditor = false;
                    break;
                
                case MyersDiff::INSERT:
//                    $this->logger->debug("...inserting item with seq $newSeq");
                    // This takes care of new addition with targets that
                    // come earlier in the item sequence in the same element,
                    // which is the most usual case
                    if ($newElement->items[$index]->type === Item::ADDITION && 
                            $newElement->items[$index]->target) {
                        if (!isset($itemIds[$newElement->items[$index]->target])) {
                            $this->logger->warning("Addition without valid target @ pos $index", get_object_vars($newElement->items[$index]));
                        } else {
//                            $this->logger->debug("Setting addition target " .
//                                $newElement->items[$index]->target .
//                                " => " .
//                                $itemIds[$newElement->items[$index]->target]);
                            $newElement->items[$index]->target = 
                                $itemIds[$newElement->items[$index]->target];
                        }
                        
                    }
//                    $this->logger->debug("... .... time=" . $time);
                    $newItemId = $this->createNewItemInDB(
                        $newElement->items[$index], 
                        $time
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
//            $this->logger->debug('...changes by new editor!');
        }
        if (!Element::isElementDataEqual($newElement, $oldElement, true, $ignoreNewEditor, false)) {
//            $this->logger->debug("...updating element in DB");
//            $this->logger->debug("... .... time=" . $time);
            $this->updateElementInDB($newElement, $time);
        }
        
        return [$newElement->id, $itemIds];
        
    }

    /**
     * @param int $elementId
     * @param bool $time
     * @return bool
     * @throws Exception
     */
    public function deleteElement(int $elementId, $time=false)
    {
        /**
         * Could there be a timing problem here? The deletes of element
         * and items will not have all the same valid_to value. There
         * might be problems if there's a query for elements for a time
         * right between those values (we're talking about 1/10th of a second
         * interval maybe)
         */
        
        if (!$time) {
            $time = TimeString::now();
        }
        $element = $this->getElementById($elementId);
        $this->getSqlQueryCounterTracker()->incrementDelete();
        $res = $this->elementsDataTable->deleteRowWithTime($element->id, $time);
        if ($res === false) {
            return false;
        }
        
        foreach ($element->items as $item) {
            $this->getSqlQueryCounterTracker()->incrementDelete();
            $res2 = $this->itemsDataTable->deleteRowWithTime($item->id, $time);
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
     * @return bool
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

    /**
     * @param $docId
     * @param $pageNum
     * @return bool
     * @throws Exception
     */
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
                 $this->pagesDataTable->updateRow([
                    'id' => $page['id'],
                    'page_number' => $newPageNum,
                    'seq' => $newSeq
                ]);
            }
        }
        
        // Delete page in pages table
        $this->getSqlQueryCounterTracker()->incrementDelete();
        if ($this->pagesDataTable->deleteRow($pageId) !== 1) {
            // This means a database error
            // Can't reproduce in testing for now
            return false; // @codeCoverageIgnore 
        }
        return true;
    }

//    public function registerTranscriptionVersion(int $pageId, int $col, string $timeFrom, int $authorId, string $descr = '', bool $isMinor = false, bool $isReview= false) {
//
//        $currentVersions = $this->getTranscriptionVersions($pageId, $col);
//
//        if (count($currentVersions) !== 0 ) {
//            $lastVersion = $currentVersions[count($currentVersions)-1];
//            $this->updateVersionUntilTime(intval($lastVersion['id']), $timeFrom);
//        }
//
//        $this->getSqlQueryCounterTracker()->incrementCreate();
//
//        return $this->txVersionsTable->createRow([
//            'page_id' => $pageId,
//            'col' => $col,
//            'time_from' => $timeFrom,
//            'time_until' => TimeString::END_OF_TIMES,
//            'author_id' => $authorId,
//            'descr' => $descr,
//            'minor' => $isMinor ? 1 : 0,
//            'review' => $isReview ? 1 : 0
//        ]);
//    }

    /**
     * Gets all the transcriptions versions associated with the given pageId and columns.
     * Returns false if there's an error.
     *
     * @param int $pageId
     * @param int $col
     * @return array|bool
     */
    public function getTranscriptionVersions(int $pageId, int $col) {
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows =  $this->txVersionsTable->findRows(['page_id' => $pageId, 'col' => $col]);
        if ($rows === false) {
            $this->logger->error("Cannot get transcription versions for page $pageId column $col");
            return false;
        }
        if (count($rows) === 0) {
            return $rows;
        }
        $timeFroms = array_column($rows, 'time_from');
        array_multisort($timeFroms, SORT_ASC, $rows);
        return $rows;
    }


    public function getTranscriptionVersionsWithAuthorInfo(int $pageId, int $col) {

        $versions = $this->getTranscriptionVersions($pageId, $col);

        $authors = array_unique(array_column($versions, 'author_id'));
        $authorInfo = [];
        foreach ($authors as $author) {
            $authorInfo[$author] = $this->userManager->getUserInfoByUserId(intval($author));
        }

        $versionNumber = 1;
        foreach($versions as &$version) {
            $version['author_name'] = $authorInfo[$version['author_id']]['fullname'];
            $version['number'] = $versionNumber++;
            $version['minor'] = intval($version['minor']) === 1 ? true : false;
            $version['review'] = intval($version['review']) === 1 ? true : false;
            $version['is_published'] = intval($version['is_published']) === 1 ? true : false;
            $version['author_username'] = $authorInfo[$version['author_id']]['username'];
        }
        return $versions;
    }

    public function updateVersionUntilTime(int $versionId, string $newTimeUntil) {
        $this->getSqlQueryCounterTracker()->incrementUpdate();
        $this->txVersionsTable->updateRow(['id' => $versionId, 'time_until' => $newTimeUntil]);
        return true;
    }

    public  function  getMySqlHelper() {
        return $this->databaseHelper;
    }

    public function isWitnessTypeValid(string $witnessType) : bool {
        return array_search($witnessType, self::VALID_WITNESS_TYPES) !== false;
    }


//    public function getValidWitnessLocationsForWorkChunkLang(string $workId, int $chunkNumber, string $language) : array {
//
//        $witnessList = $this->getWitnessesForChunk($workId, $chunkNumber);
//
//        $witnessesForLang = [];
//
//        foreach($witnessList as $witness) {
//            switch($witness['type']) {
//                case DataManager::WITNESS_TRANSCRIPTION:
//                    $docInfo = $this->getDocById($witness['id']);
//                    if ($docInfo['lang'] !== $language) {
//                        // not the right language
//                        continue;
//                    }
//                    $locations = $this->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
//                    if (count($locations)===0) {
//                        // No data for this witness, this would only happen
//                        // if somebody erased the chunk marks from the document
//                        // in the few milliseconds between getDocsForChunk() and
//                        // getChunkLocationsForDoc()
//                        continue; // @codeCoverageIgnore
//                    }
//                    // Check if there's an invalid segment
//                    $invalidSegment = false;
//                    foreach($locations as $segment) {
//                        if (!$segment['valid']) {
//                            $invalidSegment = true;
//                            break;
//                        }
//                    }
//                    if ($invalidSegment) {
//                        continue; // nothing to do with this witness
//                    }
//                    $witnessesForLang[] = [
//                        'id' => $witness['id'],
//                        'type' => DataManager::WITNESS_TRANSCRIPTION,
//                        'locations' => $locations
//                    ];
//                    break;
//
//                case DataManager::WITNESS_PLAINTEXT:
//
//            }
//        }
//        return $witnessesForLang;
//    }


    private function reportException(string $context, Exception $e) {
        $this->logger->error('Exception caught in ' . $context, [ 'errorCode' => $e->getCode(), 'errorMessage' => $e->getMessage()]);
    }

    //  Factory functions

    public function createDocInfoFromDbRow(array $row) : DocInfo {
        $di = new DocInfo();

        $di->id = intval($row['id']);
        $di->title = $row['title'];
        $di->shortTitle = $row['short_title'];
        $di->imageSource = $row['image_source'];
        $di->imageSourceData = $row['image_source_data'];
        $di->lang = $row['lang'];
        $di->docType = $row['doc_type'];

        return $di;
    }
}