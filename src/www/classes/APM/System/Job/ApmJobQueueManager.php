<?php

namespace APM\System\Job;

use APM\System\SystemManager;
use Exception;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\InvalidSearchSpec;
use ThomasInstitut\DataTable\InvalidSearchType;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\TimeString\InvalidTimeString;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\TimeString;

class ApmJobQueueManager extends JobQueueManager implements LoggerAwareInterface
{

    use LoggerAwareTrait;


    private DataTable $dataTable;
    /**
     * @var JobHandlerInterface[]
     */
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
            throw new InvalidArgumentException("Empty name given");
        }

        $this->registeredJobs[$name] = $job;
        return true;
    }

    private function getScheduledJobTitle(string $name, string $description) : string {
        if ($description === '') {
            return $name;
        }

        return "$name $description";

    }


    private function getJobSignature(string $name, string $description, array $payload) : string {

        $id = $name . $description . json_encode($payload);

        return hash('md2', $id);
    }

    private function getLastScheduledTimeForJob(string $signature) : int {

        $rows = $this->dataTable->findRows([ 'signature' => $signature]);

        if ($rows->count() === 0) {
            return -1;
        }
        $timestamps = [];
        foreach($rows as $row) {
            if ($row['state'] !== ScheduledJobState::ERROR) {
                try {
                    $timestamps[] = TimeString::toTimeStamp($row['scheduled_at']);
                } catch (InvalidTimeString|InvalidTimeZoneException $e) {
                    // should never happen
                    throw new \RuntimeException("Exception converting timeString to timestamp: " . $row['scheduled_at']);
                }
            }
        }
        if (count($timestamps) === 0) {
            return -1;
        }
        return max($timestamps);
    }

    public function scheduleJob(string $name, string $description, array $payload, int $secondsToWait = 0, int $maxAttempts = 1, int $secondBetweenRetries = 5): int
    {
        if (!$this->isRegistered($name)) {
            $this->logger->error("Attempt to schedule non-registered job '$name'");
            return -1;
        }
        $signature = $this->getJobSignature($name, $description, $payload);

        $minSecsBetweenSchedules = $this->registeredJobs[$name]->minTimeBetweenSchedules();

        if ($minSecsBetweenSchedules !== 0) {
            $timeSinceLastSchedule = time() - $this->getLastScheduledTimeForJob($signature);
            if ($timeSinceLastSchedule < $minSecsBetweenSchedules) {
                $this->logger->info("Rejecting schedule for job $name, only $timeSinceLastSchedule seconds has passed since last schedule");
                return -1;
            }
        }


        $timeStampNow = microtime(true);
        try {
            $nextRetry = TimeString::fromTimeStamp($timeStampNow + $secondsToWait);
            $scheduledAt = TimeString::fromTimeStamp($timeStampNow);
        } catch (InvalidTimeZoneException $e) {
            // should never happen!
            $this->logger->error($e->getMessage());
            return -1;
        }

        $row = [
            'signature' => $signature,
            'name' => $name,
            'description' => $description,
            'payload' => serialize($payload),
            'state'=> ScheduledJobState::WAITING,
            'next_retry_at' => $nextRetry,
            'scheduled_at' => $scheduledAt,
            'max_attempts' => $maxAttempts,
            'secs_between_retries' => $secondBetweenRetries,
            'completed_runs' => 0
        ];
        try {
            $rowId = $this->dataTable->createRow($row);
        } catch (RowAlreadyExists $e) {
            // should never happen!
            $this->logger->error($e->getMessage());
            return -1;
        }
        $this->logger->info(sprintf("Job '%s' scheduled with id %d", $this->getScheduledJobTitle($name, $description), $rowId));
        return $rowId;
    }

    public function rescheduleJob(int $jobId, int $secondsToWait = 0, int $maxAttempts = -1, int $secondBetweenRetries = -1): int
    {
        if (!$this->dataTable->rowExists($jobId)) {
            return -1;
        }
        $timeStampNow = microtime(true);
        try {
            $nextRetry = TimeString::fromTimeStamp($timeStampNow + $secondsToWait);
            $scheduledAt = TimeString::fromTimeStamp($timeStampNow);
        } catch (InvalidTimeZoneException $e) {
            // should never happen!
            $this->logger->error($e->getMessage());
            return -1;
        }
        $row = [
            'id' => $jobId,
            'state'=> ScheduledJobState::WAITING,
            'next_retry_at' => $nextRetry,
            'scheduled_at' => $scheduledAt,
            'completed_runs' => 0
        ];

        if ($maxAttempts !== -1) {
            $row['max_attempts'] = $maxAttempts;
        }
        if ($secondBetweenRetries !== -1) {
            $row['secs_between_retries'] = $secondBetweenRetries;
        }

        try {
            $this->dataTable->updateRow($row);
        } catch (InvalidRowForUpdate $e) {
            // should never happen!
            $this->logger->error($e->getMessage());
            return -1;
        }
        return $jobId;

    }

    private function isRegistered(string $name) : bool {
        return $name !== '' && isset($this->registeredJobs[$name]);
    }

    public function process(): void
    {
        $now = TimeString::now();

        try {
            $scheduledJobs = $this->dataTable->search([
                ['column' => 'state', 'condition' => DataTable::COND_EQUAL_TO, 'value' => ScheduledJobState::WAITING],
                ['column' => 'next_retry_at', 'condition' => DataTable::COND_LESS_THAN, 'value' => $now]
            ]);
        } catch (InvalidSearchSpec|InvalidSearchType $e) {
            // should never happen!
            $this->logger->error($e->getMessage());
            return;
        }

        foreach($scheduledJobs as $jobRow) {
            $this->doJob($jobRow);
        }
    }


    protected function doJob($jobRow): void
    {

        if (!$this->isRegistered($jobRow['name'])) {
            $this->logger->error("Scheduled job is not registered", $jobRow);
            try {
                $this->dataTable->updateRow(['id' => $jobRow['id'], 'state' => ScheduledJobState::ERROR]);
            } catch (InvalidRowForUpdate $e) {
                // should never happen!
                $this->logger->error($e->getMessage());
                return;
            }
            return;
        }
        $jobId = $jobRow['id'];
        $jobName = $jobRow['name'];
        $jobDescription = $jobRow['description'];
        $jobTitle = $this->getScheduledJobTitle($jobName, $jobDescription);
        $completedRuns = intval($jobRow['completed_runs']) + 1;
        $maxRetries = intval($jobRow['max_attempts']);

        try {
            $this->dataTable->updateRow([
                'id' => $jobRow['id'],
                'state' => ScheduledJobState::RUNNING,
                'last_run_at' => TimeString::now()
            ]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen!
            $this->logger->error($e->getMessage());
            return;
        }
        $handler = $this->registeredJobs[$jobRow['name']];
        $payload = unserialize($jobRow['payload']);
        $secondsBetweenRetries = intval($jobRow['secs_between_retries']);
        $start = microtime(true);
        try {
            $result = $handler->run($this->systemManager, $payload);
        } catch (Exception $e) {
            $this->logger->info("Job '$jobTitle' caused an exception", [ 'class' => get_class($e), 'code' => $e->getCode(), 'msg' => $e->getMessage()]);
            $result = false;
        }
        $runTimeInMs = intval((microtime(true) - $start)*1000);
        if ($result){
            // success
            try {
                $this->dataTable->updateRow([
                    'id' => $jobRow['id'],
                    'completed_runs' => $completedRuns,
                    'state' => ScheduledJobState::DONE,
                    'last_run_at' => TimeString::now(),
                    'next_retry_at' => null
                ]);
            } catch (InvalidRowForUpdate $e) {
                // should never happen!
                $this->logger->error($e->getMessage());
                return;
            }
            $this->logger->info("Job '$jobTitle' (id $jobId) finished successfully in $runTimeInMs ms");
            return;
        }

        if ($completedRuns < $maxRetries) {
            // schedule next retry
            $this->logger->info("Job '$jobTitle' (id $jobId) finished with error, next attempt due $secondsBetweenRetries sec from now");
            $timeStampNow = microtime(true);
            try {
                $this->dataTable->updateRow([
                    'id' => $jobRow['id'],
                    'completed_runs' => $completedRuns,
                    'state' => ScheduledJobState::WAITING,
                    'next_retry_at' => TimeString::fromTimeStamp($timeStampNow + $secondsBetweenRetries),
                    'last_run_at' => TimeString::fromTimeStamp($timeStampNow)
                ]);
            } catch (InvalidRowForUpdate|InvalidTimeZoneException $e) {
                // should never happen!
                $this->logger->error($e->getMessage());
                return;
            }
            return;
        }
        // fail
        $this->logger->error("Job '$jobTitle' (id $jobId) finished with error, no more retries left");
        try {
            $this->dataTable->updateRow([
                'id' => $jobRow['id'],
                'completed_runs' => $completedRuns,
                'state' => ScheduledJobState::ERROR,
                'last_run_at' => TimeString::now(),
                'next_retry_at' => null
            ]);
        } catch (InvalidRowForUpdate $e) {
            // should never happen!
            $this->logger->error($e->getMessage());
            return;
        }
    }

    public function cleanQueue(): void
    {
        try {
            $jobsToClean = $this->dataTable->search([
                ['column' => 'state', 'condition' => DataTable::COND_EQUAL_TO, 'value' => ScheduledJobState::DONE],
                ['column' => 'state', 'condition' => DataTable::COND_EQUAL_TO, 'value' => ScheduledJobState::ERROR],
            ], DataTable::SEARCH_OR);
            $this->logger->info(sprintf("Deleting %d finished jobs from queue", count($jobsToClean)));
            $inTransaction = false;
            if ($this->dataTable->supportsTransactions()) {
                $inTransaction = $this->dataTable->startTransaction();
            }
            foreach ($jobsToClean as $jobRow) {
                $this->dataTable->deleteRow($jobRow['id']);
            }
            if ($inTransaction) {
                $this->dataTable->commit();
            }
        } catch (InvalidSearchSpec|InvalidSearchType $e) {
            // should never happen!
            $this->logger->error($e->getMessage());
            return;
        }
    }

    public function getJobCountsByState(): array
    {
        $states = [ ScheduledJobState::WAITING, ScheduledJobState::RUNNING, ScheduledJobState::ERROR, ScheduledJobState::DONE];
        $returnObject = [];
        foreach ($states as $state) {
            $returnObject[$state] = count($this->getJobsByState($state));
        }
        return $returnObject;
    }

    public function getJobsByState(string $state) : array {
        return iterator_to_array($this->dataTable->findRows([ 'state' => $state]));
    }


}