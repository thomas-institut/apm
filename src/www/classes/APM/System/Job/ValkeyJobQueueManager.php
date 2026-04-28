<?php

namespace APM\System\Job;

use APM\System\SystemManager;
use Predis\Client;
use Psr\Log\LoggerInterface;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\TimeString;

/**
 * Valkey-based job queue manager
 */
class ValkeyJobQueueManager extends JobQueueManager
{
    private Client $valkey;
    private LoggerInterface $logger;
    private string $prefix;
    private array $registeredJobs = [];

    private string $keyWaiting;
    private string $keyData;
    private string $keyProcessing;
    private string $keyDead;

    public function __construct(Client $valkey, LoggerInterface $logger, string $prefix = 'APM:Queue:')
    {
        $this->valkey = $valkey;
        $this->logger = $logger;
        $this->prefix = $prefix;

        $this->keyWaiting = $this->prefix . 'Waiting';
        $this->keyData = $this->prefix . 'Data';
        $this->keyProcessing = $this->prefix . 'Processing';
        $this->keyDead = $this->prefix . 'Dead';
    }

    public function registerJob(string $name, JobHandlerInterface $job): bool
    {
        if ($name === '') {
            return false;
        }
        $this->registeredJobs[$name] = $job;
        return true;
    }

    private function getJobSignature(string $name, string $description, array $payload): string
    {
        $id = $name . $description . json_encode($payload);
        return hash('md2', $id);
    }

    private function isRegistered(string $name): bool
    {
        return $name !== '' && isset($this->registeredJobs[$name]);
    }

    public function scheduleJob(string $name, string $description, array $payload, int $secondsToWait = 0, int $maxAttempts = 1, int $secondBetweenRetries = 5): string
    {
        if (!$this->isRegistered($name)) {
            $this->logger->error("Attempt to schedule non-registered job '$name'");
            return '';
        }

        $signature = $this->getJobSignature($name, $description, $payload);
        $now = microtime(true);

        try {
            $scheduledAt = TimeString::fromTimeStamp($now);
        } catch (InvalidTimeZoneException $e) {
            $this->logger->error($e->getMessage());
            return '';
        }

        $jobData = [
            'signature' => $signature,
            'name' => $name,
            'description' => $description,
            'payload' => $payload,
            'max_attempts' => $maxAttempts,
            'secs_between_retries' => $secondBetweenRetries,
            'attempts' => 0,
            'scheduled_at' => $scheduledAt,
            'last_run_at' => null,
        ];

        $score = $now + $secondsToWait;

        // Atomic schedule/update
        $this->valkey->transaction(function ($tx) use ($signature, $jobData, $score) {
            /** @var Client $tx */
            $tx->hsetnx($this->keyData, $signature, json_encode($jobData));
            $tx->zadd($this->keyWaiting, [$signature => $score]);
        });

        $this->logger->info(sprintf("Job '%s' scheduled with signature %s", $name . ($description ? " $description" : ""), $signature));

        return $signature;
    }

    public function rescheduleJob(string $jobId, int $secondsToWait = 0, int $maxAttempts = -1, int $secondBetweenRetries = -1): string
    {
        $data = $this->valkey->hget($this->keyData, $jobId);
        if (!$data) {
            return '';
        }

        $jobData = json_decode($data, true);
        if ($maxAttempts !== -1) {
            $jobData['max_attempts'] = $maxAttempts;
        }
        if ($secondBetweenRetries !== -1) {
            $jobData['secs_between_retries'] = $secondBetweenRetries;
        }
        $jobData['attempts'] = 0; // Reset attempts on manual reschedule

        $now = microtime(true);
        $score = $now + $secondsToWait;

        $this->valkey->transaction(function ($tx) use ($jobId, $jobData, $score) {
            /** @var Client $tx */
            $tx->hset($this->keyData, $jobId, json_encode($jobData));
            $tx->zadd($this->keyWaiting, [$jobId => $score]);
            // Ensure it's not in Processing if we are rescheduling it manually? 
            // Actually, if it's in Processing, we might want to leave it there or let the worker finish.
            // But usually reschedule means "run it again/later".
        });

        return $jobId;
    }

    public function process(): void
    {
        // For Valkey based system, processing is done by external workers.
        // This method might be used for local processing if needed, but PRD says Workers are separate.
        // I'll leave it empty or implement a simple loop if we want to support the old way too.
        $this->logger->warning("process() called on ValkeyJobQueueManager. Use external workers instead.");
    }

    public function cleanQueue(): void
    {
        // In Valkey, successful jobs are removed immediately.
        // We could clean the Dead queue here if we want.
        $this->valkey->del([$this->keyDead]);
        $this->logger->info("Dead job queue cleared.");
    }

    public function getJobCountsByState(): array
    {
        return [
            ScheduledJobState::WAITING => $this->valkey->zcard($this->keyWaiting),
            ScheduledJobState::RUNNING => $this->valkey->hlen($this->keyProcessing),
            ScheduledJobState::DONE => 0, // Done jobs are removed
            ScheduledJobState::ERROR => $this->valkey->hlen($this->keyDead),
        ];
    }

    public function getJobsByState(string $state): array
    {
        $jobs = [];
        switch ($state) {
            case ScheduledJobState::WAITING:
                $signatures = $this->valkey->zrange($this->keyWaiting, 0, -1);
                foreach ($signatures as $sig) {
                    $data = $this->valkey->hget($this->keyData, $sig);
                    if ($data) {
                        $job = json_decode($data, true);
                        $job['id'] = $sig;
                        $job['state'] = ScheduledJobState::WAITING;
                        $job['completed_runs'] = $job['attempts'];
                        $jobs[] = $job;
                    }
                }
                break;
            case ScheduledJobState::RUNNING:
                $processing = $this->valkey->hgetall($this->keyProcessing);
                foreach ($processing as $sig => $info) {
                    $data = $this->valkey->hget($this->keyData, $sig);
                    if ($data) {
                        $job = json_decode($data, true);
                        $job['id'] = $sig;
                        $job['state'] = ScheduledJobState::RUNNING;
                        $job['completed_runs'] = $job['attempts'];
                        $jobs[] = $job;
                    }
                }
                break;
            case ScheduledJobState::ERROR:
                $dead = $this->valkey->hgetall($this->keyDead);
                foreach ($dead as $sig => $data) {
                    $job = json_decode($data, true);
                    $job['id'] = $sig;
                    $job['state'] = ScheduledJobState::ERROR;
                    $job['completed_runs'] = $job['attempts'];
                    $jobs[] = $job;
                }
                break;
        }
        return $jobs;
    }
}
