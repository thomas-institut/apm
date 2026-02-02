<?php
/* 
 *  Copyright (C) 2024 Universität zu Köln
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

namespace APM\System\Scope;

use APM\System\ApmMySqlTableName;
use PDO;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ToolBox\MySqlHelper;

class ScopeManager
{
    private MySqlHelper $dbHelper;
    private array $tableNames;

    public function __construct(PDO $dbConn, array $tableNames, LoggerInterface $logger)
    {
        $this->dbHelper = new MySqlHelper($dbConn, $logger);
        $this->tableNames = $tableNames;
    }

    public function getScopeIdsForUser(int $userId): array
    {
        $userId = intval($userId);
        $table = $this->tableNames[ApmMySqlTableName::TABLE_SCOPE_USERS];
        $rows = $this->dbHelper->getAllRows("SELECT scope_id FROM `$table` WHERE user_id=$userId");
        if ($rows === false) {
            return [];
        }
        return array_values(array_map(fn(array $row) => intval($row['scope_id']), $rows));
    }

    public function getDocumentIdsForUser(int $userId): array
    {
        return $this->getDocumentIdsForScopes($this->getScopeIdsForUser($userId));
    }

    public function getDocumentIdsForScopes(array $scopeIds): array
    {
        if (count($scopeIds) === 0) {
            return [];
        }
        $scopeIds = array_map('intval', $scopeIds);
        $idSet = implode(',', $scopeIds);
        $table = $this->tableNames[ApmMySqlTableName::TABLE_SCOPE_DOCUMENTS];
        $rows = $this->dbHelper->getAllRows("SELECT DISTINCT document_id FROM `$table` WHERE scope_id IN ($idSet)");
        if ($rows === false) {
            return [];
        }
        return array_values(array_map(fn(array $row) => intval($row['document_id']), $rows));
    }
}
