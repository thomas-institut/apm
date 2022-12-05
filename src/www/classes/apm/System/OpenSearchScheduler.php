<?php
namespace APM\System;

use Psr\Log\LoggerInterface;
use ThomasInstitut\TimeString\TimeString;

class OpenSearchScheduler
{
    private $schedulerTable;
    private $logger;

    public function __construct($sqlTable, LoggerInterface $logger)
    {
        $this->schedulerTable = $sqlTable;
        $this->logger = $logger;
    }

    // Function to write the metadata of saved transcriptions to the sql-table ,scheduler'
    public function write($doc_id, $page, $col) {

        $now = TimeString::now();
        $table_id = 0; // Will raise by one automatically

        // Avoid duplicates in the schedule (for example, if someone saves a transcription multiple times in a minute)
        $rows = $this->schedulerTable->findRows(['Status' => 'WAITING']);
        foreach ($rows as $row) {
            if ($row['Doc_ID'] == $doc_id && $row['Page'] == $page && $row['Col'] == $col) {
                return true;
            }
        }

        // Create new row in scheduler-table
        $this->schedulerTable->createRow([
            'id' => $table_id,
            'Doc_ID' => $doc_id,
            'Page' => $page,
            'Col' => $col,
            'Time_Scheduled' => $now,
            'Status' => 'WAITING']);

        // Log action
        $this->logger->debug("Transcription (Doc ID: $doc_id, Page: $page, Column: $col) has been scheduled.");

        return true;
    }

    // Function to read all waiting (unprocessed) data from the sql-table ,scheduler' for processing
    public function read() {

        $rows = $this->schedulerTable->findRows(['Status' => 'WAITING']);

        foreach ($rows as $row) {

            $table_id = $row['id'];
            $now = TimeString::now();

            $this->schedulerTable->updateRow([
                'id' => $table_id,
                'Time_Processed' => $now,
                'Status' => 'PROCESSING'
            ]);
        }

        // Log action
        $this->logger->debug("Waiting transcriptions have been read and processed.");

        return $rows;
    }

    // Function to log that a transcription was created/updated in the OpenSearch index
    public function log($table_id, $opensearch_id, $status) {

        $this->schedulerTable->updateRow([
            'id' => $table_id,
            'OpenSearch_ID' => $opensearch_id,
            'Status' => $status
        ]);

        // Log action
        $this->logger->debug("Transcription (OpenSearch ID: $opensearch_id) has been created or updated.");

        return true;
    }
}
