<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

namespace APM\FullTranscription;

use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataTable\UnitemporalDataTable;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;
use ThomasInstitut\TimeString\TimeString;

class ApmPageManager extends PageManager implements LoggerAwareInterface, ErrorReporter, SqlQueryCounterTrackerAware
{
    use LoggerAwareTrait;
    use SimpleErrorReporterTrait;
    use SimpleSqlQueryCounterTrackerAware;

    const CACHE_TYPE_PAGE_ID = 'ID';
    const CACHE_TYPE_PAGE_NUMBER = 'PN';
    const CACHE_TYPE_PAGE_SEQUENCE = 'SEQ';


    private UnitemporalDataTable $pagesDataTable;
    private InMemoryDataCache $localMemCache;

    public function __construct(UnitemporalDataTable $pagesDataTable, LoggerInterface $logger)
    {
        $this->setLogger($logger);
        $this->resetError();
        $this->pagesDataTable = $pagesDataTable;
        $this->localMemCache = new InMemoryDataCache();
    }

    public function getPageInfoByDocSeq(int $docId, int $seq) : PageInfo {

        $cacheKey = $this->getCacheKey(self::CACHE_TYPE_PAGE_SEQUENCE, $docId, $seq);

        $cacheHit = true;
        try {
            $pageInfo = unserialize($this->localMemCache->get($cacheKey));
        } catch (KeyNotInCacheException $e) {
            $cacheHit = false;
        }

        if ($cacheHit && isset($pageInfo)) {
            return $pageInfo ;
        }

        $this->getSqlQueryCounterTracker()->incrementSelect();

        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId,
            'seq'=> $seq
        ],1);
        if ($rows === []) {
            $this->throwInvalidArgumentException("Page $docId, seq $seq not found", self::ERROR_PAGE_NOT_FOUND);
        }
        $pageInfo = PageInfo::createFromDatabaseRow($rows[0]);
        $this->storePageInfoInCache($pageInfo);
        return $pageInfo;
    }

    public function getPageInfoByDocPage(int $docId, int $pageNumber) : PageInfo {
        $cacheKey = $this->getCacheKey(self::CACHE_TYPE_PAGE_NUMBER, $docId, $pageNumber);

        $cacheHit = true;
        try {
            $pageInfo = unserialize($this->localMemCache->get($cacheKey));
        } catch (KeyNotInCacheException $e) {
            $cacheHit = false;
        }

        if ($cacheHit && isset($pageInfo)) {
            return $pageInfo;
        }

        $this->getSqlQueryCounterTracker()->incrementSelect();

        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId,
            'page_number'=> $pageNumber
        ],1);
        if ($rows === []) {
            $this->throwInvalidArgumentException("Page $docId, page $pageNumber not found", self::ERROR_PAGE_NOT_FOUND);
        }
        $pageInfo = PageInfo::createFromDatabaseRow($rows[0]);
        $this->storePageInfoInCache($pageInfo);

        return $pageInfo;
    }

    /**
     * @inheritDoc
     */
    public function getPageInfoArrayForDoc(int $docId): array
    {
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId
        ]);

        $pageInfoArray = [];

        foreach($rows as $row) {
            $pageInfo = PageInfo::createFromDatabaseRow($row);
            $this->storePageInfoInCache($pageInfo);
            $pageInfoArray[] = $pageInfo;
        }
        uasort($pageInfoArray, function ($a, $b) {
            /** @var $a PageInfo */
            /** @var $b PageInfo */
            return $this->compareIntegers($a->sequence, $b->sequence);
        } );
        return $pageInfoArray;
    }

    private function compareIntegers(int $a, int $b) : int {
        if ($a === $b) {
            return 0;
        }
        return ($a < $b) ? -1 : 1;
    }

    /**
     * @inheritDoc
     */
    public function getPageInfoById(int $pageId): PageInfo
    {
        $cacheKey = $this->getCacheKey(self::CACHE_TYPE_PAGE_ID, $pageId);

        $cacheHit = true;
        try {
            $pageInfo = unserialize($this->localMemCache->get($cacheKey));
        } catch (KeyNotInCacheException $e) {
            $cacheHit = false;
        }

        if ($cacheHit) {
            return $pageInfo;
        }

        $row = [];
        try {
            $this->getSqlQueryCounterTracker()->incrementSelect();
            $row = $this->pagesDataTable->getRow($pageId);
        } catch (InvalidArgumentException $e) {
            // no such page!
            $this->throwInvalidArgumentException("Page $pageId not found", self::ERROR_PAGE_NOT_FOUND);
        }
        if ($row === []) {
            $this->throwRunTimeException('Unknown error occurred', self::ERROR_UNKNOWN);
        }
        $pageInfo = PageInfo::createFromDatabaseRow($row);
        $this->storePageInfoInCache($pageInfo);
        return $pageInfo;
    }

    /**
     * @inheritDoc
     */
    public function updatePageSettings(int $pageId, PageInfo $newPageInfo): void
    {
        $newPageInfo->pageId = $pageId;
        if ( $newPageInfo->pageNumber === 0 ||
            $newPageInfo->sequence === 0 ||
            $newPageInfo->langCode === ''
        ) {
            $this->logger->error("Invalid new page settings to update page $pageId", $newPageInfo->getDatabaseRow());
            throw new InvalidArgumentException("Invalid new settings to update page $pageId");
        }
        $databaseRow = $newPageInfo->getDatabaseRow();
        unset($databaseRow['doc_id']); // must not update doc id, it is set at creation time only
        $this->pagesDataTable->updateRow($databaseRow);
        $this->invalidatePageInfoInCache($newPageInfo);

    }

    private function getCacheKey(string $type, int $id, int $number = 0) {
        $delimiter = '_';
        return implode($delimiter, [ $type, $id, $number]);
    }

    private function storePageInfoInCache(PageInfo $pageInfo) {
        $cacheKeyPN = $this->getCacheKey(self::CACHE_TYPE_PAGE_NUMBER, $pageInfo->docId, $pageInfo->pageNumber);
        $cacheKeySeq = $this->getCacheKey(self::CACHE_TYPE_PAGE_SEQUENCE, $pageInfo->docId, $pageInfo->sequence);
        $cacheKeyPageId = $this->getCacheKey(self::CACHE_TYPE_PAGE_ID, $pageInfo->pageId);
        $serializedPageInfo = serialize($pageInfo);
        $this->localMemCache->set($cacheKeyPN, $serializedPageInfo);
        $this->localMemCache->set($cacheKeySeq, $serializedPageInfo);
        $this->localMemCache->set($cacheKeyPageId, $serializedPageInfo);
    }

    private function invalidatePageInfoInCache(PageInfo $pageInfo) {
        $cacheKeyPN = $this->getCacheKey(self::CACHE_TYPE_PAGE_NUMBER, $pageInfo->docId, $pageInfo->pageNumber);
        $cacheKeySeq = $this->getCacheKey(self::CACHE_TYPE_PAGE_SEQUENCE, $pageInfo->docId, $pageInfo->sequence);
        $cacheKeyPageId = $this->getCacheKey(self::CACHE_TYPE_PAGE_ID, $pageInfo->pageId);
        try {
            $this->localMemCache->delete($cacheKeyPN);
            $this->localMemCache->delete($cacheKeySeq);
            $this->localMemCache->delete($cacheKeyPageId);
        } catch (KeyNotInCacheException $e) {
            // not a problem if keys not in cache, do nothing
        }
    }
}