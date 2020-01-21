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


use APM\System\SimpleSqlQueryCounterTrackerAware;
use APM\System\SqlQueryCounterTracker;
use APM\System\SqlQueryCounterTrackerAware;
use DataTable\DataTable;

use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

class ApmDocManager extends DocManager implements LoggerAwareInterface, ErrorReporter, SqlQueryCounterTrackerAware
{

    use LoggerAwareTrait;
    use SimpleErrorReporterTrait;
    use SimpleSqlQueryCounterTrackerAware;

    /**
     * @var DataTable
     */
    private $docDataTable;

    public function __construct(DataTable $docDataTable, LoggerInterface $logger)
    {
        $this->setLogger($logger);
        $this->resetError();

        $this->docDataTable = $docDataTable;

    }

    public function getDocInfoById(int $docId): DocInfo
    {
        $row = [];
        try {
            $this->getSqlQueryCounterTracker()->countSelect();
            $row = $this->docDataTable->getRow($docId);
        } catch (\InvalidArgumentException $e) {
            // no such document!
            $this->throwInvalidArgumentException("Document $docId not found in database", self::ERROR_DOC_NOT_FOUND);
        }
        if ($row === []) {
            $this->throwRunTimeException('Unknown error occured', self::ERROR_UNKNOWN);
        }
        return DocInfo::createFromDatabaseRow($row);
    }
}