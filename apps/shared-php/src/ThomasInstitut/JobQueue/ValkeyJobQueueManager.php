<?php

namespace ThomasInstitut\JobQueue;

use Predis\Client;
use Predis\Transaction\MultiExec;
use Psr\Log\LoggerInterface;
use RuntimeException;
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
    private string $keyStats;

    public const string DEFAULT_PREFIX = 'APM:Queue:';
    public const string SUFFIX_WAITING = 'Waiting';
    public const string SUFFIX_DATA = 'Data';
    public const string SUFFIX_PROCESSING = 'Processing';
    public const string SUFFIX_DEAD = 'Dead';
    public const string SUFFIX_STATS = 'Stats';

    public function __construct(Client $valkey, LoggerInterface $logger, string $prefix = self::DEFAULT_PREFIX)
    {
        $this->valkey = $valkey;
        $this->logger = $logger;
        $this->prefix = $prefix;

        $this->keyWaiting = $this->prefix . self::SUFFIX_WAITING;
        $this->keyData = $this->prefix . self::SUFFIX_DATA;
        $this->keyProcessing = $this->prefix . self::SUFFIX_PROCESSING;
        $this->keyDead = $this->prefix . self::SUFFIX_DEAD;
        $this->keyStats = $this->prefix . self::SUFFIX_STATS;
    }

    public function registerJob(string $name, JobHandlerInterface $job): bool
    {
        if ($name === '') {
            return false;
        }
        $this->registeredJobs[$name] = $job;
        return true;
    }

    public function getJobHandler(string $name): ?JobHandlerInterface
    {
        return $this->registeredJobs[$name] ?? null;
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
        } catch (InvalidTimeZoneException $e) { // @codeCoverageIgnore
            $this->logger->error($e->getMessage()); // @codeCoverageIgnore
            throw new RuntimeException("Failed to create TimeString from timestamp", 0, $e); // @codeCoverageIgnore
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

        $this->valkey->transaction(function (MultiExec $tx) use ($signature, $jobData, $score) {
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

        $this->valkey->transaction(function (MultiExec $tx) use ($jobId, $jobData, $score) {
            $tx->hset($this->keyData, $jobId, json_encode($jobData));
            $tx->zadd($this->keyWaiting, [$jobId => $score]);
            // no need to check if the job is in the processing queue, even if it were
            // rescheduling means process it again later
        });

        return $jobId;
    }

    public function process(): void
    {
        // processing must be done by external workers
        $this->logger->warning("process() called on ValkeyJobQueueManager. Use external workers instead."); // @codeCoverageIgnore
    }

    public function cleanQueue(): void
    {
        $this->valkey->del([$this->keyDead]);
        $this->logger->info("Dead job queue cleared.");
    }

    public function getJobCountsByState(): array
    {
        return [
            ScheduledJobState::WAITING => $this->valkey->zcard($this->keyWaiting),
            ScheduledJobState::RUNNING => $this->valkey->hlen($this->keyProcessing),
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

    public function isJobActive(string $name, string $description, array $payload): bool
    {
        $signature = $this->getJobSignature($name, $description, $payload);

        // Check waiting queue (Sorted Set)
        if ($this->valkey->zscore($this->keyWaiting, $signature) !== null) {
            return true;
        }

        // Check processing queue (Hash)
        if ($this->valkey->hexists($this->keyProcessing, $signature)) {
            return true;
        }

        return false;
    }

    /**
     * Atomically fetches a job that is ready to be processed.
     * Moves the job from Waiting to Processing.
     *
     * @param string $workerId
     * @return array|null [signature, data] or null if no job available
     */
    public function fetchJob(string $workerId): ?array
    {
        /*
         * A LUA script is used here because the fetch operation must be atomic.
         * Specifically, we need to:
         * 1. Find a job ready to be processed (ZRANGEBYSCORE).
         * 2. Read the job's full data (HGET).
         * 3. Move the job from 'Waiting' to 'Processing' (ZREM and HSET).
         *
         * Standard Redis transactions (MULTI/EXEC) do not allow using the results of a command
         * (like the job signature from ZRANGEBYSCORE) within subsequent commands in the same transaction.
         * LUA scripts run atomically on the server and can use variables to bridge these steps.
         */
        $script = <<<LUA
local waiting_key = KEYS[1]
local data_key = KEYS[2]
local processing_key = KEYS[3]
local now = ARGV[1]
local worker_id = ARGV[2]

local jobs = redis.call('ZRANGEBYSCORE', waiting_key, '-inf', now, 'LIMIT', 0, 1)
if #jobs == 0 then
    return nil
end

local signature = jobs[1]
local data = redis.call('HGET', data_key, signature)

if not data then
    redis.call('ZREM', waiting_key, signature)
    return nil
end

redis.call('ZREM', waiting_key, signature)
redis.call('HSET', processing_key, signature, cjson.encode({
    worker_id = worker_id,
    started_at = tonumber(now)
}))

return {signature, data}
LUA;

        $result = $this->valkey->eval($script, 3, $this->keyWaiting, $this->keyData, $this->keyProcessing, microtime(true), $workerId);

        if (!$result) {
            return null;
        }

        return [
            'signature' => $result[0],
            'data' => json_decode($result[1], true)
        ];
    }

    /**
     * Marks a job as successfully finished and removes it from the queue.
     *
     * @param string $signature
     */
    public function finishJob(string $signature): void
    {
        $today = date('Y-m-d');
        $this->valkey->transaction(function (MultiExec $tx) use ($signature, $today) {
            $tx->hdel($this->keyData, [$signature]);
            $tx->hdel($this->keyProcessing, [$signature]);
            $tx->hincrby($this->keyStats, "completed:$today", 1);
        });
    }

    /**
     * Marks a job as failed. Depending on the retry flag and max attempts,
     * it might be rescheduled or moved to the Dead Letter queue.
     *
     * @param string $signature
     * @param string $error
     * @param bool $retry
     */
    public function failJob(string $signature, string $error, bool $retry): void
    {
        $data = $this->valkey->hget($this->keyData, $signature);
        if (!$data) {
            $this->valkey->hdel($this->keyProcessing, [$signature]);
            return;
        }

        $jobData = json_decode($data, true);
        $jobData['attempts']++;
        $jobData['last_error'] = $error;
        $jobData['last_run_at'] = TimeString::now();

        if ($retry && $jobData['attempts'] < $jobData['max_attempts']) {
            $delay = $jobData['secs_between_retries'] * pow(2, $jobData['attempts'] - 1);
            $score = microtime(true) + $delay;

            $this->valkey->transaction(function (MultiExec $tx) use ($signature, $jobData, $score) {
                $tx->hset($this->keyData, $signature, json_encode($jobData));
                $tx->zadd($this->keyWaiting, [$signature => $score]);
                $tx->hdel($this->keyProcessing, [$signature]);
            });
        } else {
            // Dead Letter
            $today = date('Y-m-d');
            $this->valkey->transaction(function (MultiExec $tx) use ($signature, $jobData, $today) {
                $tx->hset($this->keyDead, $signature, json_encode($jobData));
                $tx->hdel($this->keyProcessing, [$signature]);
                $tx->hdel($this->keyData, [$signature]);
                $tx->zrem($this->keyWaiting, $signature);
                $tx->hincrby($this->keyStats, "failed:$today", 1);
            });
        }
    }

    /**
     * Scans for orphaned jobs in the Processing queue and moves them back to Waiting.
     *
     * @param int $timeoutSeconds
     * @return int Number of recovered jobs
     */
    public function runRecovery(int $timeoutSeconds = 1800): int
    {
        $processing = $this->valkey->hgetall($this->keyProcessing);
        $recovered = 0;
        $now = microtime(true);

        foreach ($processing as $signature => $infoJson) {
            $info = json_decode($infoJson, true);
            if ($now - $info['started_at'] > $timeoutSeconds) {
                $this->logger->warning("Recovering orphaned job", ['signature' => $signature, 'info' => $info]);

                // Move back to waiting
                $this->valkey->transaction(function (MultiExec $tx) use ($signature) {
                    $tx->zadd($this->keyWaiting, [$signature => microtime(true)]);
                    $tx->hdel($this->keyProcessing, [$signature]);
                });
                $recovered++;
            }
        }
        return $recovered;
    }

    /**
     * @inheritDoc
     */
    public function getJobStats(): JobStats
    {
        $stats = $this->valkey->hgetall($this->keyStats);
        $parsedStats = [];
        foreach ($stats as $key => $count) {
            $parts = explode(':', $key);
            if (count($parts) !== 2) {
                continue; // @codeCoverageIgnore
            }
            [$type, $date] = $parts;
            $parsedStats[$date][$type] = (int)$count;
        }

        ksort($parsedStats);

        $dailyStats = [];
        foreach ($parsedStats as $date => $counts) {
            $dailyStats[] = new DailyJobStats(
                $date,
                $counts['completed'] ?? 0,
                $counts['failed'] ?? 0
            );
        }

        return new JobStats($dailyStats);
    }

    /**
     * @inheritDoc
     */
    public function resetJobStats(): void
    {
        $this->valkey->del($this->keyStats);
    }
}
