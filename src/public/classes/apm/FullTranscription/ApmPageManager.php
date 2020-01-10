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


use APM\System\iSqlQueryCounterTrackerAware;
use APM\System\SimpleSqlQueryCounterTrackerAware;
use APM\System\SqlQueryCounterTracker;
use DataTable\UnitemporalDataTable;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ErrorReporter\iErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

class ApmPageManager extends PageManager implements LoggerAwareInterface, iErrorReporter, iSqlQueryCounterTrackerAware
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
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);

        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId,
            'seq'=> $seq
        ],1);
        if ($rows === []) {
            throw new InvalidArgumentException("No page info found for $docId : $seq");
        }
        $this->pageInfoCache[$docId][$seq] = PageInfo::createFromDatabaseRow($rows[0]);
        return $this->pageInfoCache[$docId][$seq];
    }

    /**
     * @inheritDoc
     */
    public function getPageInfoArrayForDoc(int $docId): array
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
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
}