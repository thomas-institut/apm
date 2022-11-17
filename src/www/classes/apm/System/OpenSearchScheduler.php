<?php
namespace APM\System;

use ThomasInstitut\DataTable\MySqlDataTable;
use PDO;
use PDOException;
use ThomasInstitut\TimeString\TimeString;


class OpenSearchScheduler
{
    //private PDO $dbConn;
    //private $table_name = ApmMySqlTableName::TABLE_SCHEDULER;

    private $schedulerTable;

    public function __construct($sqlTable)
    {
        $this->schedulerTable = $sqlTable;
    }

    public function create($doc_id, $page, $col) {

        $now = TimeString::now();

//        // Set up database connection
//        try {
//            $this->dbConn = $this->setUpDbConnection();
//        } catch (PDOException $e) {
//            $this->logAndSetError(self::ERROR_DATABASE_CONNECTION_FAILED,
//                "Database connection failed: " . $e->getMessage());
//            return;
//        }
//
//        // Set up SchedulerTable
//        try {
//            $schedulerTable = new MySqlDataTable($this->dbConn,
//                $this->table_name);
//        } catch (Exception $e) {
//            // Cannot replicate this in testing, yet
//            // @codeCoverageIgnoreStart
//            $this->logAndSetError(self::ERROR_CANNOT_READ_SETTINGS_FROM_DB,
//                "Cannot read settings from database: [ " . $e->getCode() . '] ' . $e->getMessage());
//            return;
//            // @codeCoverageIgnoreEnd
//        }
//
//        //$this->schedulerMgr = new SettingsManager($schedulerTable);
//        //$this->schedulerMgr->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());

        // Create new row in database
        $this->schedulerTable->createRow([
            'doc_id' => $doc_id,
            'page' => $page,
            'column' => $col,
            'time_scheduled' => $now,
            'status' => 'waiting', // will be changed to 'processing' and 'indexed' in the process-method
            'time_indexed' => '00:00:00']);

        return true;
    }

    public function process() {

        return true;
    }
}