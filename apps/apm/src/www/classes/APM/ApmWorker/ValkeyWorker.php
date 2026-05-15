<?php

namespace APM\ApmWorker;

use APM\System\ApmSystemManager;
use Monolog\Logger;
use PDOException;
use ThomasInstitut\JobQueue\ValkeyJobQueueManager;
use Throwable;

/**
 * Worker class for processing jobs from a Valkey-based queue.
 */
class ValkeyWorker
{

    const int MinDbResetConnectionIntervalInMinutes = 5;
    const int DefaultMaxJobs = 100;
    const int MinMaxJobs = 1;
    const int DefaultMicroSecondsToSleep = 500000;
    const int DefaultDbConnectionResetIntervalInMinutes = 360;
    private ApmSystemManager $systemManager;
    private int $instanceId;
    private Logger $logger;
    private bool $stopRequested = false;
    private int $jobsProcessed = 0;
    private int $maxJobs;
    private string $workerId;
    private int $microSecondsToSleep;
    private int $lastRecoveryTime = 0;
    private int $recoveryInterval = 300; // 5 minutes
    private int $lastDbConnectionResetTime = 0;
    private int $dbConnectionResetIntervalInSeconds;

    /**
     * @param ApmSystemManager $systemManager
     * @param int $instanceId
     * @param int $maxJobs
     * @param int $microSecondsToSleep
     * @param int $dbConnectionResetIntervalInMinutes
     */
    public function __construct(
        ApmSystemManager $systemManager,
        int $instanceId,
        int $maxJobs = self::DefaultMaxJobs,
        int $dbConnectionResetIntervalInMinutes = self::DefaultDbConnectionResetIntervalInMinutes,
        int $microSecondsToSleep = self::DefaultMicroSecondsToSleep,
    )
    {
        $this->systemManager = $systemManager;
        $this->instanceId = $instanceId;
        $this->maxJobs = max(self::MinMaxJobs, $maxJobs );
        $this->microSecondsToSleep = $microSecondsToSleep;
        $this->dbConnectionResetIntervalInSeconds = max(self::MinDbResetConnectionIntervalInMinutes, $dbConnectionResetIntervalInMinutes) * 60;
        $this->workerId = gethostname() . ':' . getmypid() . ':' . $instanceId;
        $logger = $systemManager->getLogger();
        $this->logger = $logger->withName(sprintf("WORKER_%02d", $instanceId));
        $this->lastDbConnectionResetTime = time();
    }

    /**
     * Main worker loop.
     */
    public function run(): void
    {
        $this->logger->info("Worker $this->instanceId starting", [
            'worker_id' => $this->workerId,
            'max_jobs' => $this->maxJobs,
            'microsecs_to_sleep' => $this->microSecondsToSleep,
            'db_connection_reset_interval' => $this->dbConnectionResetIntervalInSeconds / 60,
            'instance_id' => $this->instanceId
        ]);

        $this->setupSignals();

        $jobManager = $this->systemManager->getJobManager();
        // this check would be needed if we ever support other job managers
//        if (!($jobManager instanceof ValkeyJobQueueManager)) {
//            $this->logger->error("Job manager is not ValkeyJobQueueManager, exiting");
//            return;
//        }

        while (!$this->stopRequested && $this->jobsProcessed < $this->maxJobs) {
            try {
                $this->checkRecovery($jobManager);
                $this->checkDbConnectionResetInterval();

                $job = $jobManager->fetchJob($this->workerId);
                if ($job) {
                    $now = microtime(true);
                    $this->processJob($jobManager, $job);
                    $durationInMs = round(1000000 * (microtime(true) - $now)) / 1000;
                    $this->jobsProcessed++;
                    $this->logger->info("Job processed", [
                        'jobId' => $job['signature'],
                        'jobName' => $job['data']['name'],
                        'durationInMs' => $durationInMs,
                        'jobsProcessed' => $this->jobsProcessed
                    ]);
                } else {
                    usleep($this->microSecondsToSleep);
                }
            } catch (Throwable $e) {
                $this->logger->error("Unexpected error in worker loop: " . $e->getMessage(), ['exception' => $e]);
                usleep($this->microSecondsToSleep);
            }

            if (function_exists('pcntl_signal_dispatch')) {
                pcntl_signal_dispatch();
            }
        }

        $this->logger->info("Worker exiting", [
            'stop_requested' => $this->stopRequested,
            'jobs_processed' => $this->jobsProcessed
        ]);
    }

    private function setupSignals(): void
    {
        if (function_exists('pcntl_async_signals')) {
            pcntl_async_signals(true);
            pcntl_signal(SIGTERM, [$this, 'handleSignal']);
            pcntl_signal(SIGINT, [$this, 'handleSignal']);
        }
    }

    /**
     * @param int $signal
     */
    public function handleSignal(int $signal): void
    {
        $this->logger->info("Signal $signal received, will exit as soon as possible");
        $this->stopRequested = true;
    }

    /**
     * Periodically runs the recovery routine to handle orphaned jobs.
     *
     * @param ValkeyJobQueueManager $jobManager
     */
    private function checkRecovery(ValkeyJobQueueManager $jobManager): void
    {
        $now = time();
        if ($now - $this->lastRecoveryTime > $this->recoveryInterval) {
            $this->lastRecoveryTime = $now;
            $count = $jobManager->runRecovery();
            if ($count > 0) {
                $this->logger->info("Recovery routine finished", ['recovered_jobs' => $count]);
            }
        }
    }

    /**
     * Periodically resets DB connection and DB-dependent managers.
     *
     * @return void
     */
    private function checkDbConnectionResetInterval(): void
    {
        $now = time();
        if ($now - $this->lastDbConnectionResetTime >= $this->dbConnectionResetIntervalInSeconds) {
            $this->lastDbConnectionResetTime = $now;
            $this->logger->info("Resetting DB connection and dependent managers");
            $this->systemManager->resetDbConnectionAndDependentManagers();
        }
    }

    /**
     * Processes a single job.
     *
     * @param ValkeyJobQueueManager $jobManager
     * @param array $job
     */
    private function processJob(ValkeyJobQueueManager $jobManager, array $job): void
    {
        $signature = $job['signature'];
        $data = $job['data'];
        $jobName = $data['name'];

        $this->logger->info("Processing job $jobName", ['signature' => $signature]);

        $handler = $jobManager->getJobHandler($jobName);
        if (!$handler) {
            $this->logger->error("No handler registered for job $jobName");
            $jobManager->failJob($signature, "No handler registered", false);
            return;
        }

        $wasRetriedAfterMysqlGoneAway = false;
        while (true) {
            try {
                $handler->run($this->systemManager, $data['payload'], $jobName);
                $jobManager->finishJob($signature);
                $this->logger->info("Job $jobName finished successfully", ['signature' => $signature]);
                return;
            } catch (Throwable $e) {
                if (!$wasRetriedAfterMysqlGoneAway && $this->isMySqlServerGoneAwayException($e)) {
                    $wasRetriedAfterMysqlGoneAway = true;
                    $this->logger->warning("Job $jobName failed with MySQL gone away, resetting managers and retrying once", [
                        'signature' => $signature,
                        'exception' => $e
                    ]);
                    $this->systemManager->resetDbConnectionAndDependentManagers();
                    $this->lastDbConnectionResetTime = time();
                    continue;
                }

                $this->logger->error("Job $jobName failed: " . $e->getMessage(), [
                    'signature' => $signature,
                    'exception' => $e
                ]);
                $jobManager->failJob($signature, $e->getMessage(), true);
                return;
            }
        }
    }

    /**
     * Checks if the exception chain contains a PDO MySQL "server has gone away" error.
     *
     * @param Throwable $exception
     * @return bool
     */
    private function isMySqlServerGoneAwayException(Throwable $exception): bool
    {
        $currentException = $exception;
        while ($currentException !== null) {
            if ($currentException instanceof PDOException && $this->isMySqlServerGoneAwayErrorCode($currentException)) {
                return true;
            }

            $currentException = $currentException->getPrevious();
        }

        return false;
    }

    /**
     * Checks if the given PDO exception corresponds to MySQL error 2006.
     *
     * @param PDOException $exception
     * @return bool
     */
    private function isMySqlServerGoneAwayErrorCode(PDOException $exception): bool
    {
        $code = (string) $exception->getCode();
        if ($code === '2006') {
            return true;
        }

        $message = strtolower($exception->getMessage());
        return str_contains($message, '2006') && str_contains($message, 'server has gone away');
    }
}
