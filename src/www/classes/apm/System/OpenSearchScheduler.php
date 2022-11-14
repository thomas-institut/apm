<?php

namespace APM\System;

use ThomasInstitut\DataTable\MySqlDataTable;
use PDO;
use PDOException;
use ThomasInstitut\TimeString\TimeString;

class OpenSearchScheduler extends ApmSystemManager
{
    private PDO $dbConn;
    private $table_name = ApmMySqlTableName::TABLE_SCHEDULER;

    public function main($doc_id, $page, $col) {

        $now = TimeString::now();

        // Set up database connection
        try {
            $this->dbConn = $this->setUpDbConnection();
        } catch (PDOException $e) {
            $this->logAndSetError(self::ERROR_DATABASE_CONNECTION_FAILED,
                "Database connection failed: " . $e->getMessage());
            return;
        }

        // Set up SchedulerTable
        try {
            $schedulerTable = new MySqlDataTable($this->dbConn,
                $this->table_name);
        } catch (Exception $e) {
            // Cannot replicate this in testing, yet
            // @codeCoverageIgnoreStart
            $this->logAndSetError(self::ERROR_CANNOT_READ_SETTINGS_FROM_DB,
                "Cannot read settings from database: [ " . $e->getCode() . '] ' . $e->getMessage());
            return;
            // @codeCoverageIgnoreEnd
        }

        //$this->schedulerMgr = new SettingsManager($schedulerTable);
        //$this->schedulerMgr->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());

        // Create new row in database
        $schedulerTable->createRow([
            'doc_id' => $doc_id,
            'page' => $page,
            'column' => $col,
            'time' => $now]);

        return true;
    }
}