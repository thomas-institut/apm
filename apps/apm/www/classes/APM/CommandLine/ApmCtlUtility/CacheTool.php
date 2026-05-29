<?php


namespace APM\CommandLine\ApmCtlUtility;


use APM\Api\ApiPeople;
use APM\CommandLine\CommandLineUtility;
use APM\System\Cache\CacheKey;
use ThomasInstitut\ValkeyDataCache\ValkeyDataCache;

class CacheTool extends CommandLineUtility implements AdminUtility
{
    const string CMD = 'cache';

    const string USAGE = self::CMD . " <option>\n\nOptions:\  info: print cache size, length, etc\n  delete <key>: deletes a key\n  flush <all|Sys|Mem>: erases all cache entries in given cache\n  clean: removes all expired entries\n";
    const string DESCRIPTION = "Cache management functions: info, clean, etc";
    const string FLUSH_SAFE_WORD = 'IKnowWhatImDoing';

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);
    }


    public function main($argc, $argv) : int
    {
       if ($argc === 1) {
           print self::USAGE . "\n";
           return 0;
       }

       switch($argv[1]) {
           case 'info':
               $this->printCacheInfo();
               break;

           case 'flush':
               $this->flushCache();
               break;

           case 'clean':
               $this->cleanCache();
               break;

           case 'delete':
               $this->deleteKey();
               break;

           default:
               print "Unrecognized option: "  . $argv[1] ."\n";
               return 0;
       }
       return 1;
    }

    private function printCacheInfo(): void
    {

        $caches = $this->getCaches();

        foreach ($caches as $cacheName => $cache) {
            if ($cache instanceof ValkeyDataCache) {
                $info = $cache->getInfo();
                print "$cacheName: Size: " . round(($info->memoryUsage / (1024 * 1024)), 2) . " MB, " . $info->itemCount . " entries\n";
            } else {
                print "$cacheName: No info available\n";
            }
        }
     }

     private function getCaches() : array {
        return [
            'Mem' => $this->getSystemManager()->getMemDataCache(),
            'Sys' => $this->getSystemManager()->getSystemDataCache(),
            ];
     }

    private function deleteKey() : void {
        if ($this->argc < 3) {
            print "Need a cache key to delete\n";
            return;
        }

        $key = $this->argv[2];
        $sm = $this->getSystemManager();
        $cache = $sm->getSystemDataCache();

        switch ($key) {
            case 'PeoplePageData':
                ApiPeople::invalidatePeoplePageDataAllParts($sm->getEntitySystem(),$cache, $this->logger);
                $cache->delete(CacheKey::ApiPeople_PeoplePageData_Parts);
                $cache->delete(CacheKey::ApiPeople_PeoplePageData_All);
                break;

            default:
                $cache->delete($key);
        }


        $msg = "Cache key deleted: " . $key;
        $this->logger->info($msg);
        print $msg . "\n";
    }

    private function flushCache(): void
    {
        if ($this->argc < 4) {
            print "Please use 'cache flush <cacheName> <theSafeWord>' to actually flush the cache\n";
            return;
        }

        if ($this->argv[3] !== self::FLUSH_SAFE_WORD) {
            print "Sorry, you don't seem to know what you're doing\n";
            return;
        }

        $caches = $this->getCaches();
        $cacheNames = array_keys($caches);

        if (in_array($this->argv[2], $cacheNames)) {
            $caches[$this->argv[2]]->flush();
            $msg = "Cache flushed: " . $this->argv[2];
            $this->logger->info($msg);
            print $msg . "\n";
            return;
        }

        if ($this->argv[2] === 'all') {
            foreach ($caches as $cacheName => $cache) {
                $cache->flush();
                $msg = "Cache flushed: " . $cacheName;
                $this->logger->info($msg);
                print $msg . "\n";
            }
            return;
        }

        printf("Unrecognized cache name '%s', valid names are: %s, or all\n", $this->argv[2], implode(', ', $cacheNames));

    }

    private function cleanCache() : void
    {
        $this->getSystemManager()->getSystemDataCache()->clean();
    }

    public function getCommand(): string
    {
        return self::CMD;
    }

    public function getHelp(): string
    {
        return self::USAGE;
    }

    public function getDescription(): string
    {
        return self::DESCRIPTION;
    }
}