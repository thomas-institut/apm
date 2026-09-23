<?php

namespace APM\ApmDaemon;

use APM\Api\ApiDocuments;
use APM\CommandLine\ApmCliUtility;
use APM\Site\SiteWorks;
use APM\System\Cache\CacheKey;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Jobs\UpdateAllPeopleDataCacheJob;
use APM\System\Jobs\UpdateApiDocumentsDataCacheJob;
use APM\System\Jobs\UpdateWorksCacheJob;
use Monolog\Logger;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\JobQueue\JobQueueManager;
use ThomasInstitut\JobQueue\ValkeyJobQueueManager;
use Throwable;

class ApmDaemon extends ApmCliUtility
{
    const int MICROSECONDS_TO_SLEEP = 100 * 1000;
    const int RECOVERY_INTERVAL = 300; // 5 minutes
    const int JOB_TIMEOUT = 1800; // 30 minutes

    private int $lastRecoveryRun = 0;


    public function main(int $argc, array $argv): bool
    {
        if (is_a($this->logger, Logger::class)) {
            $this->logger = $this->logger->withName('DAEMON');
        }

        $this->logger->info("Starting as a daemon, pid is $this->pid");
        if (!$this->writePidFile()) {
            $this->logger->error("Could not write PID file, exiting");
            exit(1);
        }
        $stopCommandReceived = false;
        pcntl_async_signals(true);
        pcntl_signal(SIGTERM, function () use (&$stopCommandReceived) {
            $this->logger->info("SIGTERM received, will exit as soon as possible");
            $stopCommandReceived = true;
        });
        pcntl_signal(SIGINT, function () use (&$stopCommandReceived) {
            $this->logger->info("Keyboard interrupt signal (SIGINT) received, will exit as soon as possible");
            $stopCommandReceived = true;
        });

        $daemonTasks = [
            new DaemonTask('CacheMaintainer', function () {
                $this->scheduleCacheRebuildJobs();
            }),
            new DaemonTask('JobQueueRecovery', function () {
                $this->runJobQueueRecovery();
            }),
        ];


        while (1) {
            if ($stopCommandReceived) {
                $this->logger->info("Exiting cleanly");
                if (!$this->erasePidFile()) {
                    $this->logger->warning("Could not erase daemon pid file");
                }
                return true;
            }
            foreach ($daemonTasks as $daemonTask) {
                try {
                    $daemonTask->run();
                } catch (Throwable $e) {
                    $this->logger->error(
                        sprintf("Throwable in daemon task %s: %s", $daemonTask->getName(), $e->getMessage())
                    );
                }
            }
            usleep(self::MICROSECONDS_TO_SLEEP);
        }
    }

    private function writePidFile(): bool
    {
        return file_put_contents($this->config['daemonPidFile'], "$this->pid") !== false;
    }

    private function erasePidFile(): bool
    {
        return unlink($this->config['daemonPidFile']);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function scheduleCacheRebuildJobs(): void
    {
        /** @var JobQueueManager $jobManager */
        $jobManager = $this->container->get(JobQueueManager::class);

        /** @var SystemMainDataCache $cache */
        $cache = $this->container->get(SystemMainDataCache::class);

        $tasks = [
            [
                'key' => SiteWorks::WORK_DATA_CACHE_KEY,
                'jobName' => UpdateWorksCacheJob::class,
                'payload' => []
            ],
            [
                'key' => ApiDocuments::DOCUMENT_DATA_CACHE_KEY,
                'jobName' => UpdateApiDocumentsDataCacheJob::class,
                'payload' => []
            ],
            [
                'key' => CacheKey::ApiPeople_PeoplePageData_All,
                'jobName' => UpdateAllPeopleDataCacheJob::class,
                'payload' => []
            ],
        ];

        foreach ($tasks as $task) {
            try {
                $cache->get($task['key']);
            } catch (ItemNotInCacheException) {
                // not in cache, check if job is already active
                if (!$jobManager->isJobActive($task['jobName'], 'Cache rebuild scheduled by Daemon', $task['payload'])) {
                    $this->logger->info("Cache item {$task['key']} missing, scheduling rebuild job {$task['jobName']}");
                    $jobManager->scheduleJob($task['jobName'], 'Cache rebuild scheduled by Daemon', $task['payload']);
                }
            }
        }
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function runJobQueueRecovery(): void
    {
        if (time() - $this->lastRecoveryRun < self::RECOVERY_INTERVAL) {
            return;
        }

        /** @var JobQueueManager $jobManager */
        $jobManager = $this->container->get(JobQueueManager::class);
        if ($jobManager instanceof ValkeyJobQueueManager) {
            $this->logger->info("Running Job Queue Recovery check");
            $recovered = $jobManager->runRecovery(self::JOB_TIMEOUT);
            $this->logger->info("Job Queue Recovery: $recovered jobs recovered");
        }
        $this->lastRecoveryRun = time();
    }

}


