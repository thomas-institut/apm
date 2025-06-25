<?php

namespace APM\ApmDaemon;

use APM\Api\ApiPeople;
use APM\CommandLine\CommandLineUtility;
use APM\Site\SiteDocuments;
use APM\Site\SiteWorks;
use APM\System\Cache\CacheKey;
use Exception;
use Fiber;
use Monolog\Logger;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use Throwable;

class ApmDaemon extends CommandLineUtility
{
    const int MICROSECONDS_TO_SLEEP = 100*1000;


    public function main($argc, $argv): void
    {

        $cacheItemsToReestablish = [
            [
                'cacheKey' => SiteWorks::WORK_DATA_CACHE_KEY,
                'ttl' => SiteWorks::WORK_DATA_TTL,
                'json' => false,
                'builder' => function () {
                    return SiteWorks::buildWorkData($this->getSystemManager(), $this->logger, true);
                }
            ],
            [
                'cacheKey' => SiteDocuments::DOCUMENT_DATA_CACHE_KEY,
                'ttl' => SiteDocuments::DOCUMENT_DATA_TTL,
                'json' => true,
                'builder' => function () {
                    return SiteDocuments::buildDocumentData($this->getSystemManager());
                }
            ],
            [
                'cacheKey' => CacheKey::ApiPeople_PeoplePageData_All,
                'ttl' => ApiPeople::AllPeopleDataForPeoplePageTtl,
                'json' => false,
                'builder' => function () {
                    return ApiPeople::buildAllPeopleDataForPeoplePage($this->getSystemManager()->getEntitySystem(),
                        $this->getSystemManager()->getSystemDataCache(), $this->getSystemManager()->getLogger());
                }
            ]
        ];

        $this->getSystemManager(); // just to get the right logger
        if (is_a($this->logger, Logger::class)) {
            $this->logger = $this->logger->withName('APM_D');
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

        $cacheMaintainerGenerator = function () use ($cacheItemsToReestablish) {
            return new Fiber( function() use ($cacheItemsToReestablish) {
                $this->reestablishCacheItems($cacheItemsToReestablish);
            });
        };

        $jobProcessorFiberGenerator = function ()  {
            return new Fiber( function()  {
                $this->getSystemManager()->getJobManager()->process();
            });
        };

        $daemonTasks = [
            new DaemonTask('CacheMaintainer', $cacheMaintainerGenerator),
            new DaemonTask('JobProcessor', $jobProcessorFiberGenerator),
        ];


        while (1) {
            if ($stopCommandReceived) {
                $this->logger->info("Exiting cleanly");
                if (!$this->erasePidFile()) {
                    $this->logger->warning("Could not erase daemon pid file");
                }
                return;
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

    private function writePidFile() : bool {
        return file_put_contents($this->config['daemonPidFile'], "$this->pid") !== false;
    }

    private  function erasePidFile() : bool {
        return unlink($this->config['daemonPidFile']);
    }

    /**
     * @throws Throwable
     */
    private function reestablishCacheItems(array $cacheItemInfo) : void
    {
        $cache = $this->getSystemManager()->getSystemDataCache();
        foreach ($cacheItemInfo as $item) {
            try {
                $cache->get($item['cacheKey']);
            } catch (ItemNotInCacheException) {
                // not in cache
                $key = $item['cacheKey'];
                $this->logger->info("$key not in cache, re-building data");
                $start = microtime(true);
                try {
                    $data = ($item['builder'])();
                } catch (Exception $e) {
                    $this->logger->error("Exception trying to build data for $key", [ 'code'=> $e->getCode(), 'msg' => $e->getMessage()]);
                    continue;
                }
                Fiber::suspend();
                if ($item['json']) {
                    $cache->set($item['cacheKey'], json_encode($data), $item['ttl'] ?? 0);
                } else {
                    $cache->set($item['cacheKey'], serialize($data), $item['ttl'] ?? 0);
                }
                $end = microtime(true);
                $this->logger->info(sprintf("Data for %s built and cached successfully in %.3f seconds", $key, $end - $start));
            }
            Fiber::suspend();
        }
    }

}


