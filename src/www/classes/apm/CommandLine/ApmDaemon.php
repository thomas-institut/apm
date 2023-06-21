<?php

namespace APM\CommandLine;

use APM\Site\SiteChunks;
use APM\Site\SiteDocuments;
use Exception;
use ThomasInstitut\DataCache\KeyNotInCacheException;

class ApmDaemon extends CommandLineUtility
{

    protected function main($argc, $argv)
    {
        $dataManager = $this->systemManager->getDataManager();

        $daemon = false;
        if (isset($argv[1]) && $argv[1] === '-d') {
            $daemon = true;
        }

        $cacheItemsToReestablish = [
            [
                'cacheKey' => SiteChunks::WORK_DATA_CACHE_KEY,
                'builder' => function () use ($dataManager) { return SiteChunks::buildWorkData($dataManager);}
            ],
            [
                'cacheKey' => SiteDocuments::DOCUMENT_DATA_CACHE_KEY,
                'builder' => function () use ($dataManager) { return SiteDocuments::buildDocumentData($dataManager);}
            ]
        ];

        if ($daemon) {
            $this->logger = $this->logger->withName('APM_D');
            $this->logger->info("Starting as a (pseudo) daemon");
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
                    exit();
                }
                $this->reestablishCacheItems($cacheItemsToReestablish);
                $this->systemManager->getJobManager()->process();
                sleep($secondsToSleep);
            }

        } else {
            if(!$this->reestablishCacheItems($cacheItemsToReestablish)){
                $this->systemManager->getJobManager()->process();
                $this->logger->info("Cache is up to date");
            }
        }
    }

    private function reestablishCacheItems(array $cacheItemInfo) : bool {
        $cache = $this->systemManager->getSystemDataCache();
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
                $cache->set($item['cacheKey'], serialize($data));
                $dataBuilt = true;
                $end = microtime(true);
                $this->logger->info(sprintf("Data for %s built and cached successfully in %.3f seconds", $key, $end - $start));
            }
        }
        return $dataBuilt;
    }

}

