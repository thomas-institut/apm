<?php

namespace APM\CommandLine;

use APM\Api\ApiPeople;
use APM\Site\SiteWorks;
use APM\Site\SiteDocuments;
use APM\System\ApmConfigParameter;
use APM\System\Cache\CacheKey;
use Exception;
use Monolog\Logger;
use ThomasInstitut\DataCache\KeyNotInCacheException;

class ApmDaemon extends CommandLineUtility
{

    public function main($argc, $argv): void
    {

        $daemon = false;
        if (isset($argv[1]) && $argv[1] === '-d') {
            $daemon = true;
        }

        $cacheItemsToReestablish = [
            [
                'cacheKey' => SiteWorks::WORK_DATA_CACHE_KEY,
                'ttl' => SiteWorks::WORK_DATA_TTL,
                'builder' => function () { return SiteWorks::buildWorkData($this->getSystemManager());}
            ],
            [
                'cacheKey' => SiteDocuments::DOCUMENT_DATA_CACHE_KEY,
                'ttl' => SiteDocuments::DOCUMENT_DATA_TTL,
                'builder' => function () {
                        return SiteDocuments::buildDocumentData($this->getSystemManager()->getDataManager());
                }
            ],
            [
                'cacheKey' => CacheKey::ApiPeople_PeoplePageData_All,
                'ttl' => ApiPeople::AllPeopleDataForPeoplePageTtl,
                'builder' => function () {
                    return ApiPeople::buildAllPeopleDataForPeoplePage($this->getSystemManager()->getEntitySystem(),
                        $this->getSystemManager()->getSystemDataCache(), $this->getSystemManager()->getLogger());
                }
            ]
        ];

        if ($daemon) {
            $this->getSystemManager(); // just to get the right logger
            if (is_a($this->logger, Logger::class)) {
                $this->logger = $this->logger->withName('APM_D');
            }

            $this->logger->info("Starting as a (pseudo) daemon, pid is $this->pid");
            if (!$this->writePidFile()) {
                $this->logger->error("Could not write PID file, exiting");
                exit(1);
            }
            $keepRunning = true;
            pcntl_async_signals(true);
            pcntl_signal(SIGTERM, function() use (&$keepRunning) {
                $this->logger->info("SIGTERM received, will exit as soon as possible");
                $keepRunning = false;
            });
            pcntl_signal(SIGINT, function() use (&$keepRunning) {
                $this->logger->info("Keyboard interrupt signal (SIGINT) received, will exit as soon as possible");
                $keepRunning = false;
            });
            $secondsToSleep = 1;
            while(1) {
                if (!$keepRunning) {
                    $this->logger->info("Exiting cleanly");
                    if (!$this->erasePidFile()){
                        $this->logger->warning("Could not erase daemon pid file");
                    }
                    exit();
                }
                $this->reestablishCacheItems($cacheItemsToReestablish);
                $this->getSystemManager()->getJobManager()->process();
                sleep($secondsToSleep);
            }

        } else {
            if(!$this->reestablishCacheItems($cacheItemsToReestablish)){
                $this->getSystemManager()->getJobManager()->process();
                $this->logger->info("Cache is up to date");
            }
        }
    }

    private function writePidFile() : bool {
        return file_put_contents($this->config[ApmConfigParameter::APM_DAEMON_PID_FILE], "$this->pid") !== false;
    }

    private  function erasePidFile() : bool {
        return unlink($this->config[ApmConfigParameter::APM_DAEMON_PID_FILE]);
    }

    private function reestablishCacheItems(array $cacheItemInfo) : bool {
        $cache = $this->getSystemManager()->getSystemDataCache();
        $dataBuilt = false;
        foreach ($cacheItemInfo as $item) {
            try {
                $cache->get($item['cacheKey']);
            } catch (KeyNotInCacheException) {
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
                $cache->set($item['cacheKey'], serialize($data), $item['ttl'] ?? 0);
                $dataBuilt = true;
                $end = microtime(true);
                $this->logger->info(sprintf("Data for %s built and cached successfully in %.3f seconds", $key, $end - $start));
            }
        }
        return $dataBuilt;
    }

}


