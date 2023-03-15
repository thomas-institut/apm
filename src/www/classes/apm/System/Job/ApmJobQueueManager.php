<?php

namespace APM\System\Job;

use APM\System\SystemManager;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\GenericDataTable;
use ThomasInstitut\TimeString\TimeString;

class ApmJobQueueManager extends JobQueueManager implements LoggerAwareInterface
{

    use LoggerAwareTrait;


    private DataTable $dataTable;
    private array $registeredJobs;
    private SystemManager $systemManager;

    public function __construct(SystemManager $systemManager, DataTable $dataTable)
    {
        $this->dataTable = $dataTable;
        $this->systemManager = $systemManager;
        $this->registeredJobs = [];
    }

    public function registerJob(string $name, JobHandlerInterface $job): bool
    {
        if ($name === '') {
            throw new \InvalidArgumentException("Empty name given");
        }

        $this->registeredJobs[$name] = [ 'handler' => $job];
        return true;
    }

    public function scheduleJob(string $name, array $payload, int $secondsToWait = 0, int $maxAttempts = 1, int $secondBetweenRetries = 5): int
    {
        if (!$this->isRegistered($name)) {
            $this->logger->error("Attempt to schedule non-registered job '$name'");
            return -1;
        }
        $timeStampNow = microtime(true);
        $row = [
            'name' => $name,
            'payload' => serialize($payload),
            'state'=> ScheduledJobState::WAITING,
            'next_retry_at' => TimeString::fromTimeStamp($timeStampNow + $secondsToWait),
            'scheduled_at' => TimeString::fromTimeStamp($timeStampNow),
            'max_attempts' => $maxAttempts,
            'secs_between_retries' => $secondBetweenRetries,
            'completed_runs' => 0
        ];
        $rowId = $this->dataTable->createRow($row);
        $this->logger->info("Job '$name' scheduled with id $rowId", $row);
        return $rowId;
    }

    private function isRegistered(string $name) : bool {
        return $name !== '' && isset($this->registeredJobs[$name]);
    }

    public function process()
    {
        $now = TimeString::now();

        $scheduledJobs = $this->dataTable->search([
            [ 'column' => 'state', 'condition' => GenericDataTable::COND_EQUAL_TO, 'value' => ScheduledJobState::WAITING ],
            [ 'column' => 'next_retry_at', 'condition' => GenericDataTable::COND_LESS_THAN, 'value' => $now]
        ]);

        $this->logger->debug("Processing " . count($scheduledJobs) . " jobs due");

        foreach($scheduledJobs as $jobRow) {
            $this->doJob($jobRow);
        }
    }

    protected function doJob($jobRow) {

        if (!$this->isRegistered($jobRow['name'])) {
            $this->logger->error("Scheduled job is not registered", $jobRow);
            $this->dataTable->updateRow(['id' => $jobRow['id'], 'state' => ScheduledJobState::ERROR]);
            return;
        }
        $jobId = $jobRow['id'];
        $jobName = $jobRow['name'];
        $completedRuns = intval($jobRow['completed_runs']) + 1;
        $maxRetries = intval($jobRow['max_attempts']);

        $this->logger->debug("Running due job $jobId: '$jobName', run $completedRuns of max $maxRetries");

        $this->dataTable->updateRow([
            'id' => $jobRow['id'],
            'state' => ScheduledJobState::RUNNING,
            'last_run_at' => TimeString::now()
        ]);
        $handler = $this->registeredJobs[$jobRow['name']]['handler'];
        $payload = unserialize($jobRow['payload']);

        $secondsBetweenRetries = intval($jobRow['secs_between_retries']);
        if ($handler->run($this->systemManager, $payload)){
            // success
            $this->dataTable->updateRow([
                'id' => $jobRow['id'],
                'completed_runs' => $completedRuns,
                'state' => ScheduledJobState::DONE,
                'last_run_at' => TimeString::now(),
                'next_retry_at' => null
            ]);
            $this->logger->debug("Job $jobId finished successfully");
            return;
        }

        if ($completedRuns < $maxRetries) {
            // schedule next retry
            $this->logger->debug("Job $jobId finished with error, next attempt due $secondsBetweenRetries sec from now");
            $timeStampNow = microtime(true);
            $this->dataTable->updateRow([
                'id' => $jobRow['id'],
                'completed_runs' => $completedRuns,
                'state' => ScheduledJobState::WAITING,
                'next_retry_at' => TimeString::fromTimeStamp( $timeStampNow + $secondsBetweenRetries),
                'last_run_at' => TimeString::fromTimeStamp($timeStampNow)
            ]);
            return;
        }
        // fail
        $this->logger->debug("Job $jobId finished with error, no more retries left");
        $this->dataTable->updateRow([
            'id' => $jobRow['id'],
            'completed_runs' => $completedRuns,
            'state' => ScheduledJobState::ERROR,
            'last_run_at' => TimeString::now(),
            'next_retry_at' => null
        ]);
    }


    public function cleanQueue()
    {
        $jobsToClean = $this->dataTable->search([
            [ 'column' => 'state', 'condition' => GenericDataTable::COND_EQUAL_TO, 'value' => ScheduledJobState::DONE ],
            [ 'column' => 'state', 'condition' => GenericDataTable::COND_EQUAL_TO, 'value' => ScheduledJobState::ERROR ],
        ], DataTable::SEARCH_OR);

        $this->logger->info(sprintf("Deleting %d finished jobs from queue", count($jobsToClean)));
        foreach ($jobsToClean as $jobRow) {
            $this->dataTable->deleteRow($jobRow['id']);
        }
    }
}