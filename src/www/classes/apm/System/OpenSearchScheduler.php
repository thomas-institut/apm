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

    public function write($doc_id, $page, $col) {

        $now = TimeString::now();
        $schedule_id = 0; // Will raise by one automatically

        // Create new row in scheduler-table
        $this->schedulerTable->createRow([
            'id' => $schedule_id,
            'doc_id' => $doc_id,
            'page' => $page,
            'col' => $col,
            'time_scheduled' => $now,
            'time_processed' => '00:00:00',
            'status' => 'waiting']); // will be changed to 'processing' and 'indexed' in the process-method

        return true;
    }

    public function read() {

        $rows = $this->schedulerTable->findRows(['status' => 'waiting']);

        foreach ($rows as $row) {

            $schedule_id = $row['id'];

            $this->schedulerTable->updateRow([
                'id' => $schedule_id,
                'status' => 'processing'
            ]);
        }

        return $rows;
    }

    public function update($schedule_id) {

        $now = TimeString::now();

        $this->schedulerTable->updateRow([
            'id' => $schedule_id,
            'time_processed' => $now,
            'status' => 'processed'
        ]);

        return true;
    }
}
