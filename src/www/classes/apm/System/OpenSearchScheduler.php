<?php
namespace APM\System;

use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\TimeString\TimeString;

class OpenSearchScheduler
{
    private MySqlDataTable $schedulerTable;
    private LoggerInterface $logger;

    const STATE_WAITING = 'waiting';
    const STATE_PROCESSING = 'processing';
    const STATE_PROCESSED = 'processed';

    const STATE_ERROR = 'error';

    public function __construct(MySqlDataTable $sqlTable, LoggerInterface $logger)
    {
        $this->schedulerTable = $sqlTable;
        $this->logger = $logger;
    }

    // Function to write the metadata of saved transcriptions to the sql-table
    public function schedule($docId, $page, $col): bool
    {

        $now = TimeString::now();

        // Avoid duplicates in the schedule (for example, if someone saves a transcription multiple times in a minute)
        $rows = $this->schedulerTable->findRows(['state' => self::STATE_WAITING]);
        foreach ($rows as $row) {
            if ($row['doc_id'] == $docId && $row['page'] == $page && $row['col'] == $col) {
                $this->logger->debug("Transcription (Doc ID: $docId, page: $page, column: $col) is already scheduled.");
                return true;
            }
        }

        // Create new row in scheduler-table
        $this->schedulerTable->createRow([
            'doc_id' => $docId,
            'page' => $page,
            'col' => $col,
            'time_scheduled' => $now,
            'state' => self::STATE_WAITING]);

        // Log action
        $this->logger->debug("Transcription (Doc ID: $docId, page: $page, column: $col) has been scheduled.");

        return true;
    }

    // Function to read all waiting (unprocessed) data from the sql-table ,scheduler for processing
    public function read(): array
    {

        $rows = $this->schedulerTable->findRows(['state' => self::STATE_WAITING]);
        $numRows = count($rows);
        // Log action
        $this->logger->debug("$numRows scheduler row(s) to be processed");

        foreach ($rows as $row) {
            $table_id = $row['id'];
            $now = TimeString::now();

            // TODO: Check this
            //  This is wrong, time_processed should be updated in the DB only
            //  when we're absolutely sure that the row was processed
            //  Furthermore, reading the rows does not necessarily mean that
            //  they're going to be processed. What if we're only checking what's in
            //  queue to be processed and displaying a list for an administrator to see?

            $this->schedulerTable->updateRow([
                'id' => $table_id,
                'time_processed' => $now,
                'state' => self::STATE_PROCESSING
            ]);
        }
        return $rows;
    }

    // Function to log that a transcription was created/updated in the OpenSearch index
    public function log($table_id, $opensearch_id, $status): bool
    {

        // TODO: check this function altogether
        //  It seems to me that this function should only mark a row as processed,
        //  this would be the place to update 'time_processed'
        $this->schedulerTable->updateRow([
            'id' => $table_id,
            'opensearch_id' => $opensearch_id,
            'state' => $status
        ]);

        // Log action
        $this->logger->debug("Row $table_id processed, OpenSearchID = $opensearch_id");

        return true;
    }
}
