<?php

namespace APM\ApmWorker;

use APM\System\ApmSystemManager;
use APM\System\Job\ValkeyJobQueueManager;
use Monolog\Logger;
use Throwable;

/**
 * Worker class for processing jobs from a Valkey-based queue.
 */
class ValkeyWorker
{
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

    public function __construct(ApmSystemManager $systemManager, int $instanceId, int $maxJobs = 100, int $microSecondsToSleep = 500000)
    {
        $this->systemManager = $systemManager;
        $this->instanceId = $instanceId;
        $this->maxJobs = $maxJobs;
        $this->microSecondsToSleep = $microSecondsToSleep;
        $this->workerId = gethostname() . ':' . getmypid() . ':' . $instanceId;


        $logger = $systemManager->getLogger();
        $this->logger = $logger->withName(sprintf("WORKER_%02d", $instanceId));
    }

    /**
     * Main worker loop.
     */
    public function run(): void
    {
        $this->logger->info("Worker $this->instanceId starting", [
            'worker_id' => $this->workerId,
            'max_jobs' => $this->maxJobs,
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

        try {
            $handler->run($this->systemManager, $data['payload'], $jobName);
            $jobManager->finishJob($signature);
            $this->logger->info("Job $jobName finished successfully", ['signature' => $signature]);
        } catch (Throwable $e) {
            $this->logger->error("Job $jobName failed: " . $e->getMessage(), [
                'signature' => $signature,
                'exception' => $e
            ]);
            $jobManager->failJob($signature, $e->getMessage(), true);
        }
    }
}
