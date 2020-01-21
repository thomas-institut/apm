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


use APM\System\SqlQueryCounterTrackerAware;
use APM\System\SimpleSqlQueryCounterTrackerAware;
use APM\System\SqlQueryCounterTracker;
use DataTable\UnitemporalDataTable;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

class ApmPageManager extends PageManager implements LoggerAwareInterface, ErrorReporter, SqlQueryCounterTrackerAware
{
    use LoggerAwareTrait;
    use SimpleErrorReporterTrait;
    use SimpleSqlQueryCounterTrackerAware;

    /**
     * @var UnitemporalDataTable
     */
    private $pagesDataTable;

    /**
     * @var array
     */
    private $pageInfoCache;

    public function __construct(UnitemporalDataTable $pagesDataTable, LoggerInterface $logger)
    {
        $this->setLogger($logger);
        $this->resetError();

        $this->pagesDataTable = $pagesDataTable;
        $this->pageInfoCache = [];
    }

    public function getPageInfoByDocSeq(int $docId, int $seq) : PageInfo {
        if (isset($this->pageInfoCache[$docId][$seq])) {
            return $this->pageInfoCache[$docId][$seq];
        }
        $this->getSqlQueryCounterTracker()->countSelect();

        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId,
            'seq'=> $seq
        ],1);
        if ($rows === []) {
            $this->throwInvalidArgumentException("Page $docId:$seq not found", self::ERROR_PAGE_NOT_FOUND);
        }
        $this->pageInfoCache[$docId][$seq] = PageInfo::createFromDatabaseRow($rows[0]);
        return $this->pageInfoCache[$docId][$seq];
    }

    /**
     * @inheritDoc
     */
    public function getPageInfoArrayForDoc(int $docId): array
    {
        $this->getSqlQueryCounterTracker()->countSelect();
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId
        ]);

        $pageInfoArray = [];

        foreach($rows as $row) {
            $pageInfo = PageInfo::createFromDatabaseRow($row);
            $this->pageInfoCache[$docId][$pageInfo->sequence] = $pageInfo;
            $pageInfoArray[] = $pageInfo;
        }
        uasort($pageInfoArray, function ($a, $b) {
            /** @var $a PageInfo */
            /** @var $b PageInfo */
            return $this->compareInts($a->sequence, $b->sequence);
        } );
        return $pageInfoArray;
    }

    private function compareInts(int $a, int $b) : int {
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
        $row = [];
        try {
            $this->getSqlQueryCounterTracker()->countSelect();
            $row = $this->pagesDataTable->getRow($pageId);
        } catch (\InvalidArgumentException $e) {
            // no such document!
            $this->throwInvalidArgumentException("Page $pageId not found", self::ERROR_PAGE_NOT_FOUND);
        }
        if ($row === []) {
            $this->throwRunTimeException('Unknown error occured', self::ERROR_UNKNOWN);
        }
        return PageInfo::createFromDatabaseRow($row);
    }
}