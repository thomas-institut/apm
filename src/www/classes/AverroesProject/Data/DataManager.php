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

use APM\System\ApmImageType;
use APM\System\ImageSource\NullImageSource;
use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
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
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\InvalidRowUpdateTime;
use ThomasInstitut\DataTable\InvalidTimeStringException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlDataTableWithRandomIds;
use APM\ToolBox\MyersDiff;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\DataTable\RowDoesNotExist;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;
use ThomasInstitut\TimeString\TimeString;
use Exception;

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


    private array $tNames;
    private PDO $dbConn;
    private LoggerInterface $logger;
    private MySqlHelper $databaseHelper;
    public EdNoteManager $edNoteManager;
    private MySqlUnitemporalDataTable $pagesDataTable;
    /**
     * Use new UserManager
     * @var UserManager
     * @deprecated
     */
    public UserManager $userManager;
    private MySqlDataTable $docsDataTable;
    private MySqlUnitemporalDataTable $elementsDataTable;
    private MySqlUnitemporalDataTable $itemsDataTable;
    private MySqlDataTable $pageTypesTable;
    private MySqlDataTable $worksTable;
    private MySqlDataTable $txVersionsTable;
    private array $langCodes;
    private InMemoryDataCache $cache;
    private array $imageSources;
    private PersonManagerInterface $pm;

    /**
     * Tries to initialize and connect to the MySQL database.
     *
     * Throws an error if there's no connection
     * or if the database is not setup properly.
     * @param PDO $dbConn
     * @param PersonManagerInterface $pm
     * @param array $tableNames
     * @param LoggerInterface $logger
     * @param array $imageSources
     * @param array $langCodes
     */
    function __construct(PDO $dbConn, PersonManagerInterface $pm, array $tableNames, LoggerInterface $logger, array $imageSources, array $langCodes = [])
    {
        $this->pm = $pm;
        $this->dbConn = $dbConn;
        $this->tNames = $tableNames;
        $this->logger = $logger;
        $this->langCodes = $langCodes;
        $this->imageSources = $imageSources;

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

        $this->cache = new InMemoryDataCache();

    }

    /**
     * Returns an array with the IDs of all the manuscripts with
     * some data in the system and the number of pages with data
     *
     * @param string $order
     * @param bool $asc
     * @return array
     */
    public function getDocIdList(string $order = '', bool $asc=true): array
    {
        $orderBy = match ($order) {
            'title' => ' ORDER BY `title` ' . ($asc ? ' ASC' : ' DESC'),
            default => '',
        };
        $query = "SELECT `id` FROM  " . $this->tNames['docs'] . $orderBy;
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $r = $this->databaseHelper->query($query);
        
        $docIds = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            $docIds[] = intval($row['id']);
        }
        return $docIds;
    }

    /**
     * Creates a new document in the system.
     * Returns the doc id of the newly created document or false
     * if the document could not be created
     *
     * @param string $title
     * @param int $pageCount
     * @param string $lang
     * @param string $type
     * @param string $imageSource
     * @param string $imageSourceData
     * @param int $tid
     * @return int|boolean
     * @throws RowAlreadyExists
     */
    public function newDoc(string $title, int $pageCount,
                           string $lang, string $type,
                           string $imageSource, string $imageSourceData, int $tid = 0): bool|int
    {
        
        $doc = [ 
            'title' => $title, 
            'tid' => $tid,
            'lang' => $lang, 
            'doc_type' => $type,
            'image_source' => $imageSource, 
            'image_source_data' => $imageSourceData
            ];
        
        $this->getSqlQueryCounterTracker()->incrementCreate();
        $docId = $this->docsDataTable->createRow($doc);
        for ($i = 1; $i <= $pageCount; $i++) {
            $this->newPage($docId, $i, $lang);
        }
        return $docId;
    }

    /**
     * @throws RowAlreadyExists
     */
    public function newPage($docId, $pageNumber, $lang, $type=0): int
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
     * @param int $pageNumber
     * @return int
     */
    function getNumColumns(int $docId, int $pageNumber): int
    {
        $pInfo = $this->getPageInfoByDocPage($docId, $pageNumber);
        if ($pInfo === false) {
            // Page or doc not found
            return 0;
        }
        return intval($pInfo['num_cols']);
    }
    
    /**
     * Adds a new column to a page
     * 
     * @param int $docId
     * @param int $pageNumber
     * @return boolean
     */
    function addNewColumn(int $docId, int $pageNumber): bool
    {
        $pageId = $this->getPageIdByDocPage($docId, $pageNumber);
        if ($pageId === -1) {
            return false;
        }
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $pageInfo = $this->pagesDataTable->getRow($pageId);
        if ($pageInfo === null) {
            $this->logger->error("page not found $pageId");
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
    function getPageInfoByDocPage(int $docId, int $pageNumber): bool|array
    {
        $pageId = $this->getPageIdByDocPage($docId, $pageNumber);
        if ($pageId === -1) {
            return false;
        }
        return $this->getPageInfo($pageId);
    }


    /**
     * @param int $pageId
     * @return array|bool
     */
    public function getPageInfo(int $pageId): bool|array
    {
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $row = $this->pagesDataTable->getRow($pageId);
        if ($row === null) {
            $this->logger->error("Page id $pageId not found");
            return false;
        }
        // Sanitize types!
        $row['page_number'] = intval($row['page_number']);
        $row['seq'] = intval($row['seq']);
        $row['num_cols'] = intval($row['num_cols']);
        return $row;
    }
    
    /**
     * Returns the number of pages of a document
     * @param int $docId
     * @return boolean|int
     */
    function getPageCountByDocId(int $docId): bool|int
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
    
    function getPageCountByDocIdAllTime($docId): bool|int
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
    function getPageTypeNames(): bool|array
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
    public function getActiveWorks(): bool|array
    {
         $query = 'SELECT dare_id, people.name, title FROM ' . $this->tNames['works'] .
                 ' AS works JOIN (' . $this->tNames['people'] . ' AS people) ON (people.tid=works.author_tid) WHERE enabled=1' ;

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
                'title' => '(' . $work['dare_id'] . ') ' . $work['name'],
                'dareId' => $work['dare_id'], 
                'maxChunk' => 500
                ];
        }
        return $theWorks;

    }

    /**
     * @throws InvalidRowForUpdate
     * @throws RowDoesNotExist
     */
    public function updateDocSettings(int $docId, array $newSettings): bool
    {
        $row['id'] = $docId;

        // NOTE: $row['tid'] must NEVER be updated

        if ($newSettings === []) {
            return false;
        }
        
        if (isset($newSettings['title'])) {
            $row['title'] = trim($newSettings['title']);
            if ($row['title'] === '') {
                return false;
            }
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
            $typeRow = $this->pageTypesTable->getRow($row['type']);
            if ($typeRow === null) {
                $this->logger->error("Unknown page type " . $row['type']);
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
    function getEditorTidsByDocId(int $docId): array
    {
        $te = $this->tNames['elements'];
        $tu = $this->tNames['users'];
        $tp = $this->tNames['pages'];


        $this->getSqlQueryCounterTracker()->incrementSelect();
        $query = "SELECT DISTINCT $tu.`tid`" .
            " FROM `$tu` JOIN (`$te`,  `$tp`)" . 
            " ON ($tu.tid=$te.editor_tid AND $tp.id=$te.page_id)" .
            " WHERE $tp.doc_id=" . $docId . 
            " AND $tp.`valid_until`='9999-12-31 23:59:59.999999'" .
            " AND $te.`valid_until`='9999-12-31 23:59:59.999999'";
        
        $r = $this->databaseHelper->query($query);
        
        $editors = [];
        while ($row = $r->fetch()) {
            $editors[] = $row['tid'];
        }
        return $editors;
    }

    /**
     * Returns the page numbers of the pages with transcription
     * data for a document id
     * @param int $docId
     * @param int $order
     * @return array
     */
    function getTranscribedPageListByDocId(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER) : array
    {
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];
        
        $orderBy = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderBy = 'seq';
        }
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $query =  'SELECT DISTINCT p.`page_number` AS page_number FROM ' . 
                $tp . ' AS p' .
                ' JOIN ' . $te . ' AS e ON p.id=e.page_id' .
                ' WHERE p.doc_id=' . $docId . 
                " AND `e`.`valid_until`='9999-12-31 23:59:59.999999'" . 
                " AND `p`.`valid_until`='9999-12-31 23:59:59.999999'" . 
                " ORDER BY p.`$orderBy`";
        $r = $this->databaseHelper->query($query);
        $pages = array();
         while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            $pages[] = $row['page_number'];
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
    function getDocPageInfo(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER): array
    {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];

        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $orderBy = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderBy = 'seq';
        }
        
        $query = "SELECT `$tp`.* FROM `$tp` JOIN `$td` " .
                 "ON (`$td`.id=`$tp`.doc_id) WHERE " . 
                 "`$tp`.`valid_until`='9999-12-31 23:59:59.999999' AND `$td`.id=$docId " . 
                 "ORDER BY `$tp`.$orderBy";
        $res = $this->databaseHelper->query($query);
        
        return $res->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @param int $docId
     * @return bool|int
     */
    function deleteDocById(int $docId): bool|int
    {
        $this->getSqlQueryCounterTracker()->incrementDelete();
        if ($this->getPageCountByDocIdAllTime($docId) !== 0) {
            return false;
        }
        return $this->docsDataTable->deleteRow($docId);
    }

    function getDocById(int $docId)
    {
        $cacheKey = "doc-$docId";
        try {
            $data = unserialize($this->cache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $this->getSqlQueryCounterTracker()->incrementSelect();
            $docInfo =  $this->databaseHelper->getRowById($this->tNames['docs'], $docId);
            $this->cache->set($cacheKey, serialize($docInfo));
            return $docInfo;
        }
        return $data;
    }
    
    function getDocByDareId(string $dareId): ?array
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->docsDataTable->findRows(['image_source_data' => $dareId], 1);
        if (count($rows) !== 1) {
            return null;
        }

        return $rows->getFirst();
    }

    /**
     * Returns an array of document Ids for the documents
     * in which a user has done some transcription work
     * @param int $userTid
     * @return array
     */
    public function getDocIdsTranscribedByUser(int $userTid) : array
    {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];
        $te = $this->tNames['elements'];
        $eot = '9999-12-31 23:59:59.999999';


        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $query = "SELECT DISTINCT $td.id, $td.title FROM $td " . 
                 "JOIN ($te, $tp) ON ($te.page_id=$tp.id and $td.id=$tp.doc_id) " . 
                 "WHERE $te.editor_tid=$userTid " .
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
     * @param int $userTid
     * @param int $docId
     * @return array
     */
    public function getPageIdsTranscribedByUser(int $userTid, int $docId) : array
    {
        $tp = $this->tNames['pages'];
        $td = $this->tNames['docs'];
        $te = $this->tNames['elements'];
        $eot = '9999-12-31 23:59:59.999999';


        $this->getSqlQueryCounterTracker()->incrementSelect();
        
        $query = "SELECT DISTINCT $tp.id, $tp.seq FROM $tp " . 
                 "JOIN ($td, $te) ON ($te.page_id=$tp.id and $td.id=$tp.doc_id) " . 
                 "WHERE $te.editor_tid=$userTid " .
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
     * @param string $type
     * @return string|boolean
     */
    public function getImageUrl(int $docId, int $imageNumber, string $type = ''): bool|string
    {
        $doc = $this->getDocById($docId);
        if ($doc === false) {
            return false;
        }

        $imageSource = $this->imageSources[$doc['image_source']] ?? new NullImageSource();
        if ($type === '') {
            $type = ApmImageType::IMAGE_TYPE_JPG;
            if ($doc['deep_zoom']) {
                $type = ApmImageType::IMAGE_TYPE_DEEP_ZOOM;
            }
        }
        return $imageSource->getImageUrl($type, $doc['image_source_data'], $imageNumber);
    }

    public function isImageDeepZoom(int $docId) : bool {
        $doc = $this->getDocById($docId);
        if ($doc === false) {
            return false;
        }
        return $doc['deep_zoom'];
    }


    /**
     * @param int $pageId
     * @param int $col
     * @param string $timeString
     * @return Element[]
     * @throws InvalidTimeStringException
     */
    public function getColumnElementsByPageId(int $pageId, int $col, string $timeString = ''): array
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        if ($timeString === '') {
            $timeString = TimeString::now();
        }
        $rows = $this->elementsDataTable->findRowsWithTime([
            'page_id' => $pageId,
            'column_number' => $col
        ], 0, $timeString);
        $theRows = iterator_to_array($rows);
        ArraySort::byKey($theRows, 'seq');


        $elements = [];
        foreach($theRows as $row) {
            $e = $this->createElementObjectFromRow($row);
            $e->items = $this->getItemsForElement($e, $timeString);
            $elements[] = $e;
        }
        return $elements;
    }

    /**
     *
     * @param int $docId
     * @param int $page
     * @param int $col
     * @param string $time
     * @return Element[]
     * @throws InvalidTimeStringException
     */
    
    public function getColumnElements(int $docId, int $page, int $col, string $time = ''): array
    {
        if ($time === '') {
            $time = TimeString::now();
        }
        //$this->logger->debug('Getting elements for time = ' . $time);
        $pageId = $this->getPageIdByDocPage($docId, $page);
        if ($pageId === -1) {
            // Non-existent page
            return [];
        }
        return $this->getColumnElementsByPageId($pageId, $col, $time);
        
    }

    /**
     * @throws InvalidTimeStringException
     */
    function getItemsForElement($element, $time = false): array
    {
        if ($time === false) {
            $time = TimeString::now();
        }


        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->itemsDataTable->findRowsWithTime([
            'ce_id' => $element->id
        ], 0, $time);

        $theRows = iterator_to_array($rows);
        ArraySort::byKey($theRows, 'seq');

        $tt=[];
        
        foreach ($theRows as $row) {
            $item = self::createItemObjectFromRow($row);
            ItemArray::addItem($tt, $item, true);
        }
        return $tt;
    }
    
    public function getWorksWithTranscriptions(): array
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
     * @param string $dareId
     * @return bool|array
     */
    public function getWorkInfoByDareId(string $dareId) : bool|array
    {
        $rows = $this->worksTable->findRows(['dare_id' => $dareId], 1);
        if (count($rows)===0) {
            return false;
        }
        $workInfo = $rows->getFirst();
        try {
            $authorInfo = $this->pm->getPersonEssentialData($workInfo['author_tid']);
//            $this->logger->info("Author info retrieved", get_object_vars($authorInfo));
            $workInfo['author_name'] = $authorInfo->name;
        } catch (PersonNotFoundException) {
            $this->logger->error("Author not found " . $workInfo['author_tid']);
            $workInfo['author_name'] = '';
        }
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
     *   id:   witness id
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
//        $lastTime = '0000-00-00 00:00:00.000000';  // times will be compared as strings, this works because MySQL stores times as 'YYYY-MM-DD HH:MM:SS.mmmmmm'
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
     * Returns an array with the chunk start and end locations
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
    private function isAfter(array $loc1, array $loc2): bool
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
    public function getChunkLocationArrayFromRawLocations(array $locationRows): array
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
    
    public function getAdditionElementIdWithGivenReference(int $reference): bool|int
    {
        $te = $this->tNames['elements'];

        $query = "SELECT id from $te where type=" . Element::SUBSTITUTION . " AND reference=$reference AND valid_until='9999-12-31 23:59:59.999999' LIMIT 1";
        $r = $this->databaseHelper->query($query);
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return (int) $row['id'];
        } 
        return false;
    }
            
    
    public function getItemStreamForElementId(int $elementId): array
    {
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
    public function getItemStreamBetweenLocations(int $docId, array $loc1, array $loc2): array
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

    /**
     * Looks up the page id for a document and page number.
     *
     * Returns -1 if the page does not exist
     *
     * @param $docId
     * @param $pageNum
     * @return int
     */
    public function getPageIdByDocPage($docId, $pageNum) : int
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId, 
            'page_number'=> $pageNum
            ],1);
        if (count($rows) === 0) {
            return -1;
        }
        return $rows->getFirst()['id'];
    }
    
     public function getPageIdByDocSeq($docId, $seq)
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId, 
            'seq'=> $seq
            ],1);
        if (count($rows) === 0) {
            return false;
        }
        return $rows->getFirst()['id'];
    }

    /**
     * Gets page information from the database for the given doc and sequences
     * If there's an error, it returns false. Otherwise, it returns an array with
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
     * @param int $docId
     * @param int $seq
     * @return bool|array
     */
    public function getPageInfoByDocSeq(int $docId, int $seq): bool|array
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId,
            'seq'=> $seq
        ],1);
        if (count($rows) === 0) {
            return false;
        }
        return $rows->getFirst();
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
     * @param string $time
     * @return bool|Element
     * @throws InvalidRowUpdateTime
     * @throws InvalidTimeStringException
     * @throws RowAlreadyExists
     * @throws RowDoesNotExist
     */
    public function insertNewElement(Element $element, bool $insertAtEnd = true, array $itemIds = [], string $time = ''): bool|Element
    {
        if ($time === '') {
            $time = TimeString::now();
        }

        if ($element->pageId === -1) {
            $this->logger->error('Element being inserted in '
                    . 'null page', ['pageId' => $element->pageId]);
            return false;
        }
        
        if ($element->columnNumber <= 0) {
            $this->logger->error('Element being inserted in '
                    . 'column <= 0', ['pageId' => $element->pageId]);
            return false;
        }
        
        if ($element->type !== Element::LINE_GAP && count($element->items) === 0) {
            $this->logger->error('Empty element being inserted', 
                    [ 'pageId' => $element->pageId,
                        'colNum' => $element->columnNumber,
                        'editorTid' => $element->editorTid]);
            return false;
        }
        
        if (!in_array($element->lang, $this->langCodes)) {
            $this->logger->error('Element with invalid language being inserted', 
                    [   'pageId' => $element->pageId,
                        'colNum' => $element->columnNumber,
                        'editorTid' => $element->editorTid,
                        'lang' => $element->lang]);
            return false;
        }
        
        // Database checks
        $pageInfo = $this->getPageInfo($element->pageId);
        
        if ($pageInfo === false) {
            $this->logger->error('Element being inserted in '
                    . 'non-existent page', ['pageId' => $element->pageId]);
            return false;
        }

        if ($element->columnNumber > $pageInfo['num_cols']) {
            $this->logger->error('Element being inserted in '
                    . 'non-existent colum', 
                    [' pageId' => $element->pageId,
                        'colNum' => $element->columnNumber]);
            return false;
        }

        try {
            $userData = $this->pm->getPersonEssentialData($element->editorTid);
            $editorIsUser = $userData->isUser;
        } catch (PersonNotFoundException) {
            $editorIsUser = false;
        }



        if (!$editorIsUser) {
            $this->logger->error('Element being inserted by '
                    . 'non-existent editor', 
                    ['pageId' => $element->pageId,
                        'colNum' => $element->columnNumber,
                        'editorTid' => $element->editorTid]);
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
        if ($newId === 0) {
            // This means a database error, but it should generate an exception!
            // Can't reproduce in testing for now
            // @codeCoverageIgnoreStart
            $this->logger->error('Can\'t save new element in DB', 
                ['pageId' => $element->pageId,
                    'seq' => $newElement->seq,
                    'colNum' => $element->columnNumber,
                    'editorTid' => $element->editorTid]);
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
            if ($newItemId === -1 ) {
                // This means a database error
                // Can't reproduce in testing for now
                // @codeCoverageIgnoreStart
                $this->logger->error('Can\'t save new items in DB', 
                ['pageId' => $element->pageId,
                    'seq' => $newElement->seq,
                    'colNum' => $element->columnNumber,
                    'editorTid' => $element->editorTid,
                    'itemType' => $item->type,
                    'itemSeq' => $item->seq
                    ]); 
                return false;
                // @codeCoverageIgnoreEnd
            }
            $itemIds[$item->id] = $newItemId;
        }
        return $this->getElementById($newId);
    }
        
    private function createNewItemInDB(Item $item, $time = false): int
    {
        
        if (!$time) {
            $time = TimeString::now();
        }
        $this->getSqlQueryCounterTracker()->incrementCreate();
        try {
            return $this->itemsDataTable->createRowWithTime([
                'ce_id' => $item->columnElementId,
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
        } catch (InvalidTimeStringException|RowAlreadyExists $e) {
            $this->logger->error("Exception creating new item in DB: " . $e->getMessage());
            return -1;
        }
    }
    
    private function updateItemInDB($item, $time = false): bool
    {
        if (!$time) {
            $time = TimeString::now();
        }

        $this->getSqlQueryCounterTracker()->incrementUpdate();
        try {
            $this->itemsDataTable->realUpdateRowWithTime([
                'id' => $item->id,
                'ce_id' => $item->columnElementId,
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
        } catch (InvalidRowUpdateTime|RowDoesNotExist|InvalidTimeStringException $e) {
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
        return true;
    }

    /**
     * @param Element $element
     * @param string $time
     * @return int
     * @throws InvalidTimeStringException
     * @throws RowAlreadyExists
     */
    private function createNewElementInDB(Element $element, string $time = ''): int
    {
         if ($time === '') {
            $time = TimeString::now();
        }
        $this->getSqlQueryCounterTracker()->incrementCreate();
        return $this->elementsDataTable->createRowWithTime([
                'type' => $element->type,
                'page_id' => $element->pageId,
                'column_number' => $element->columnNumber,
                'seq' => $element->seq,
                'lang' => $element->lang,
                'editor_tid' => $element->editorTid,
                'hand_id' => $element->handId,
                'reference' => $element->reference,
                'placement' => $element->placement
            ], $time);
    }

    /**
     * @param Element $element
     * @param bool|string $time
     * @return bool
     * @throws InvalidRowUpdateTime
     * @throws InvalidTimeStringException
     * @throws RowDoesNotExist
     */
    private function updateElementInDB(Element $element, bool|string $time = false): bool
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
//                'editor_id' => 0,
                'editor_tid' => $element->editorTid,
                'hand_id' => $element->handId,
                'reference' => $element->reference,
                'placement' => $element->placement
            ], $time);
        return true;
    }
    
       
    private function getMaxElementSeq(int $pageId, int $col): int
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
    
    public function getItemById(int $itemId): Item|bool
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $row = $this->itemsDataTable->getRow($itemId);
        if ($row === null) {
            $this->logger->error("Item id $itemId not found");
            return false;
        }
        return self::createItemObjectFromRow($row);
    }


    public function getElementById($elementId): bool|Element
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
        $row = $this->elementsDataTable->getRow($elementId);
        if ($row === null) {
            return false;
        }
        $e = $this->createElementObjectFromRow($row);

        try {
            $e->items = $this->getItemsForElement($e);
        } catch (InvalidTimeStringException $e) {
            // should NEVER happen
            throw new RuntimeException($e->getMessage());
        }
        return $e;
    }
    
    public static function createElementObjectFromArbitraryRow($fields, $row) : Element {
        
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
        }
        if (!isset($e)) {
            throw new RuntimeException("Unknown Element type in $row", $row);
        }
        $e->columnNumber = (int) $row[$fields['column_number']];
        $e->pageId = (int) $row[$fields['page_id']];
        $e->seq = (int) $row[$fields['seq']];
//        $e->editorId = (int) $row[$fields['editor_id']];
        $e->editorTid = intval($row[$fields['editor_tid']]);
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
    public static function createElementArrayFromArray(array $theArray): array
    {
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
    
    private function createElementObjectFromRow($row): Element
    {
        $fields = [ 
            'id' => 'id',
            'type'=> 'type',
            'page_id' => 'page_id',
            'column_number' => 'column_number',
            'seq' => 'seq',
            'lang' => 'lang',
//            'editor_id' => 'editor_id',
            'editor_tid' => 'editor_tid',
            'hand_id' => 'hand_id',
            'reference' => 'reference',
            'placement' => 'placement'
        ];
        return self::createElementObjectFromArbitraryRow($fields, $row);
    }
    
    public static function createElementObjectFromArray($theArray): Element
    {
        $fields = [ 
            'id' => 'id',
            'type'=> 'type',
            'page_id' => 'pageId',
            'column_number' => 'columnNumber',
            'seq' => 'seq',
            'lang' => 'lang',
//            'editor_id' => 'editorId',
            'editor_tid' => 'editorTid',
            'hand_id' => 'handId',
            'reference' => 'reference',
            'placement' => 'placement'
        ];
        return self::createElementObjectFromArbitraryRow($fields, $theArray);
    }
    
    public static function createItemObjectFromArbitraryRow($fields, $row) : Item{
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
        if (!isset($item)) {
            throw new RuntimeException("Unknown item type found in row", $row);
        }
        $item->lang = $row[$fields['lang']];
        $item->handId = $row[$fields['hand_id']];
        $item->setColumnElementId($row[$fields['ce_id']]);
        return $item;
    }
    
    public static function createItemObjectFromRow($row) : Item
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
    
    public static function createItemObjectFromArray($theArray)  : Item
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
     * @param int $pageId
     * @param int $columnNumber
     * @param array $newElements
     * @param string $time
     * @return array|bool
     * @throws Exception
     */
    public function updateColumnElements(int $pageId, int $columnNumber, array $newElements, string $time = ''): bool|array
    {
        $this->logger->debug("UPDATING COLUMN ELEMENTS, pageId=$pageId, col=$columnNumber");
        // force pageId and columnNumber in the elements in $newElements
        foreach ($newElements as $element ) {
            $element->pageId = $pageId;
            $element->columnNumber = $columnNumber;
        }

        $oldElements = $this->getColumnElementsByPageId($pageId, $columnNumber);
        $editScript = ElementArray::getEditScript(
            $oldElements,
            $newElements
        );

        if ($time === '') {
            $time = TimeString::now();
        }
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
                    list (, $ids) = $this->updateElement($newElements[$newElementsIndex], $oldElements[$index], $newItemsIds, $time);
                    foreach($ids as $oldId => $newId) {
                        $newItemsIds[$oldId] = $newId;
                    }
                    $newElementsIndex++;
                    break;
                    
                case MyersDiff::DELETE:
                    $this->logger->debug("DELETING element @ " . $index . ", id=" . $oldElements[$index]->id);
//                    $this->logger->debug("... .... time=" . $time);
                    $this->deleteElement($oldElements[$index]->id, $time);
                    break;
                
                case MyersDiff::INSERT:
                    $this->logger->debug("INSERTING element @ " . $index);
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
                    $this->logger->debug("...element id = " . $element->id);
                    $newElementsIndex++;
                    break;
            }
        }
        $this->logger->debug(":: finished UPDATING COLUMN ELEMENTS, pageId=$pageId, col=$columnNumber");
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
    public function updateElement(Element $newElement, Element $oldElement, array $itemIds = [], bool|string $time = false): array
    {
        if (!$time) {
            $time = TimeString::now();
        }
        // Force element IDs to be same, we're only dealing with the element's data
        if ($newElement->id !== $oldElement->id) {
            $newElement->id = $oldElement->id;
        }

        $this->logger->debug("   UPDATING ELEMENT $oldElement->id");
        
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
                    $this->logger->debug("   Keeping item $index");
                    if ($oldElement->items[$index]->seq 
                            !== $newSeq) {
                        $this->logger->debug("   ... with new seq $newSeq");
                        $oldElement->items[$index]->seq =
                                $newSeq;
                        $this->updateItemInDB(
                            $oldElement->items[$index],
                            $time
                        );
                    }
                    
                    if ($oldElement->items[$index]->type === Item::ADDITION) {
                        $this->logger->debug("   Keeping an addition",get_object_vars($oldElement->items[$index]));
                        if ($oldElement->items[$index]->target !== 0) {
                            $this->logger->debug("   ...with non-zero target", [ 'target'=>$oldElement->items[$index]->target]);
                            if (!isset($itemIds[$oldElement->items[$index]->target])) {
                                $this->logger->warning("Addition without valid target @ pos $index", get_object_vars($oldElement->items[$index]));
                            } 
                            else {
                                if ($oldElement->items[$index]->target !== $itemIds[$oldElement->items[$index]->target]) {
                                    $oldElement->items[$index]->target = $itemIds[$oldElement->items[$index]->target];
                                    $this->logger->debug("   ...with new target", [ 'target'=>$oldElement->items[$index]->target]);
//                                    $this->logger->debug("  ... .... time=" . $time);
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
                    $this->logger->debug("  Deleting item $index");
                    $this->getSqlQueryCounterTracker()->incrementDelete();
//                    $this->logger->debug("... .... time=" . $time);
                    $this->itemsDataTable->deleteRowWithTime(
                        $oldElement->items[$index]->id,
                        $time
                    );
                    $ignoreNewEditor = false;
                    break;
                
                case MyersDiff::INSERT:
                    $this->logger->debug("   Inserting new item with seq $newSeq");
                    // This takes care of new addition with targets that
                    // come earlier in the item sequence in the same element,
                    // which is the most usual case
                    if ($newElement->items[$index]->type === Item::ADDITION && 
                            $newElement->items[$index]->target) {
                        if (!isset($itemIds[$newElement->items[$index]->target])) {
                            $this->logger->warning("Addition without valid target @ pos $index", get_object_vars($newElement->items[$index]));
                        } else {
                            $this->logger->debug("   Setting addition target " .
                                $newElement->items[$index]->target .
                                " => " .
                                $itemIds[$newElement->items[$index]->target]);
                            $newElement->items[$index]->target = 
                                $itemIds[$newElement->items[$index]->target];
                        }
                        
                    }
                    $newItemId = $this->createNewItemInDB(
                        $newElement->items[$index], 
                        $time
                    );
                    if ($newItemId === -1) {
                        $this->logger->error("Could not create new item in DB", [ 'class' => __CLASS__, 'function' => __FUNCTION__]);
                        throw new RuntimeException("Could not add new item in DB");
                    }
                    $this->logger->debug("   ... with item Id = $newItemId");

                    $itemIds[$newElement->items[$newItemsIndex]->id] = $newItemId;
                    $newItemsIndex++;
                    $ignoreNewEditor = false;
                    break;
            }
        }
        if (!$ignoreNewEditor && $newElement->editorTid !== $oldElement->editorTid) {
            $this->logger->debug("   ...changes by new editor: $newElement->editorTid");
        }
        if (!Element::isElementDataEqual($newElement, $oldElement, true, $ignoreNewEditor, false)) {
            $this->logger->debug("   ...updating element in DB");
//            $this->logger->debug("... .... time=" . $time);
            $this->updateElementInDB($newElement, $time);
        }
        
        return [$newElement->id, $itemIds];
        
    }

    /**
     * @param int $elementId
     * @param bool $timeString
     * @return bool
     * @throws Exception
     */
    public function deleteElement(int $elementId, bool|string $timeString=false): bool
    {

        // TODO: do all deletes within a transaction
        /**
         * Could there be a timing problem here? The deletes of element
         * and items will not have all the same valid_to value. There
         * might be problems if there's a query for elements for a time
         * right between those values (we're talking about 1/10th of a second
         * interval maybe)
         */
        
        if (!$timeString) {
            $timeString = TimeString::now();
        }
        $element = $this->getElementById($elementId);
        $this->getSqlQueryCounterTracker()->incrementDelete();
        $this->elementsDataTable->deleteRowWithTime($element->id, $timeString);
//        if ($res === false) {
//            return false;
//        }
        
        foreach ($element->items as $item) {
            $this->getSqlQueryCounterTracker()->incrementDelete();
            $this->itemsDataTable->deleteRowWithTime($item->id, $timeString);
//            if ($res2 === false) {
//                return false;
//            }
        }
        return true;
    }

    /**
     * Returns true if the given page does not any transcription data
     * associated with it
     * @param int $pageId
     * @return bool
     */
    public function isPageEmpty(int $pageId): bool
    {
        $pageInfo = $this->getPageInfo($pageId);
        if ($pageInfo['num_cols'] === 0) {
            return true;
        }
        for ($i = 1; $i <= $pageInfo['num_cols']; $i++) {
            try {
                $elements = $this->getColumnElementsByPageId($pageId, $i);
            } catch (InvalidTimeStringException $e) {
                // should NEVER happen
                throw new RuntimeException($e->getMessage());
            }
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
    public function deletePage($docId, $pageNum): bool
    {
        $pageId = $this->getPageIdByDocPage($docId, $pageNum);
        if ($pageId === -1) {
            return true;
        }
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
    public function getTranscriptionVersions(int $pageId, int $col): bool|array
    {
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows =  $this->txVersionsTable->findRows(['page_id' => $pageId, 'col' => $col]);
        if (count($rows) === 0) {
            return [];
        }
        $theRows = iterator_to_array($rows);

        $timeFromArray = array_column($theRows, 'time_from');
        array_multisort($timeFromArray, SORT_ASC, $theRows);
        return $theRows;
    }


    public function getTranscriptionVersionsWithAuthorInfo(int $pageId, int $col): bool|array
    {

        $versions = $this->getTranscriptionVersions($pageId, $col);

        $authorTids = array_unique(array_column($versions, 'author_tid'));
        $authorInfo = [];
        foreach ($authorTids as $authorTid) {
            try {
                $authorData = $this->pm->getPersonEssentialData($authorTid)->getExportObject();
            } catch (PersonNotFoundException) {
                $authorData = null;
            }
            if ($authorData !== null) {
                $authorInfo[$authorTid] = $authorData;
            }
        }

        $versionNumber = 1;
        foreach($versions as &$version) {
            $version['author_name'] = $authorInfo[$version['author_tid']]['name'];
            $version['number'] = $versionNumber++;
            $version['minor'] = intval($version['minor']) === 1;
            $version['review'] = intval($version['review']) === 1;
            $version['is_published'] = intval($version['is_published']) === 1;
            $version['author_username'] = $authorInfo[$version['author_tid']]['userName'];
        }
        return $versions;
    }

    public function getMySqlHelper(): MySqlHelper
    {
        return $this->databaseHelper;
    }

    private function reportException(string $context, Exception $e): void
    {
        $this->logger->error('Exception caught in ' . $context, [ 'errorCode' => $e->getCode(), 'errorMessage' => $e->getMessage()]);
    }

    //  Factory functions

    public function createDocInfoFromDbRow(array $row) : DocInfo {
        $di = new DocInfo();

        $di->id = intval($row['id']);
        $di->tid = intval($row['tid']);
        $di->title = $row['title'];
        $di->shortTitle = $row['short_title'];
        $di->imageSource = $row['image_source'];
        $di->imageSourceData = $row['image_source_data'];
        $di->lang = $row['lang'];
        $di->docType = $row['doc_type'];

        return $di;
    }
}