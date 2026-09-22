<?php


namespace APM\CommandLine\ApmCtlUtility;


use APM\Api\ApiPeople;
use APM\CommandLine\CliToolBox;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\Cache\CacheKey;
use APM\System\Cache\SystemDirDataCache;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Cache\SystemMemDataCache;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\ValkeyDataCache\ValkeyDataCache;

class CacheTool implements ApmCtlUtility
{
    const string CMD = 'cache';

    const string USAGE = self::CMD . " <option>\n\nOptions:\n  info: print cache size, length, etc\n  delete <key>: deletes a key\n  flush <all|Sys|Mem>: erases all cache entries in given cache\n  clean: removes all expired entries\n";
    const string DESCRIPTION = "Cache management functions: info, clean, etc";
    const string FLUSH_SAFE_WORD = 'IKnowWhatImDoing';

    public function __construct(
        private readonly SystemMainDataCache      $systemMainDataCache,
        private readonly SystemMemDataCache       $systemMemDataCache,
        private readonly SystemDirDataCache       $systemDirDataCache,
        private readonly ApmEntitySystemInterface $apmEntitySystem,
        private readonly LoggerInterface          $logger,
    )
    {

    }

    public function run(int $argc, array $argv): int
    {
        if ($argc === 1) {
            print self::USAGE . "\n";
            return 0;
        }

        switch ($argv[1]) {
            case 'info':
                $this->printCacheInfo();
                break;

            case 'flush':
                if ($argc < 4) {
                    print "Please use 'cache flush <cacheName> <theSafeWord>' to actually flush the cache\n";
                    return 0;
                }

                if ($argv[3] !== self::FLUSH_SAFE_WORD) {
                    print "Sorry, you don't seem to know what you're doing\n";
                    return 0;
                }
                $this->flushCache(CliToolBox::sanitizeArg($argv[2]));
                break;

            case 'clean':
                $cacheName = 'all';
                if (isset($argv[2])) {
                    $cacheName = CliToolBox::sanitizeArg($argv[2]);
                }
                $this->cleanCache($cacheName);
                break;

            case 'delete':
                if ($argc < 3) {
                    print "Need a cache key to delete\n";
                    return 0;
                }
                $this->deleteKey(CliToolBox::sanitizeArg($argv[2]));
                break;

            default:
                print "Unrecognized option: " . $argv[1] . "\n";
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

    /**
     * @return array<string, DataCache>
     */
    private function getCaches(): array
    {
        return [
            'Mem' => $this->systemMemDataCache,
            'Sys' => $this->systemMainDataCache,
            'Dir' => $this->systemDirDataCache,
        ];
    }

    private function deleteKey(string $key): void
    {

        $apmEntitySystem = $this->apmEntitySystem;
        $cache = $this->systemMainDataCache;

        switch ($key) {
            case 'PeoplePageData':
                ApiPeople::invalidatePeoplePageDataAllParts($apmEntitySystem, $cache, $this->logger);
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

    private function flushCache(string $cacheName): void
    {
        $caches = $this->getCaches();
        $cacheNames = array_keys($caches);

        if (in_array($cacheName, $cacheNames)) {
            $caches[$cacheName]->flush();
            $msg = "Cache flushed: " . $cacheName;
            $this->logger->info($msg);
            print $msg . "\n";
            return;
        }

        if ($cacheName === 'all') {
            foreach ($caches as $cacheName => $cache) {
                $cache->flush();
                $msg = "Cache flushed: " . $cacheName;
                $this->logger->info($msg);
                print $msg . "\n";
            }
            return;
        }

        printf("Unrecognized cache name '%s', valid names are: %s, or all\n", $cacheName, implode(', ', $cacheNames));

    }

    private function cleanCache(string $cacheName): void
    {
        $caches = $this->getCaches();
        $cacheNames = array_keys($caches);

        if (in_array($cacheName, $cacheNames)) {
            $caches[$cacheName]->clean();
            $msg = "Cache cleaned: " . $cacheName;
            $this->logger->info($msg);
            print $msg . "\n";
            return;
        }

        if ($cacheName === 'all') {
            foreach ($caches as $cacheName => $cache) {
                $cache->clean();
                $msg = "Cache cleaned: " . $cacheName;
                $this->logger->info($msg);
                print $msg . "\n";
            }
            return;
        }

        printf("Unrecognized cache name '%s', valid names are: %s, or all\n", $cacheName, implode(', ', $cacheNames));

    }

    static public function getName(): string
    {
        return self::CMD;
    }

    static public function getUsage(): string
    {
        return self::USAGE;
    }

    static public function getDescription(): string
    {
        return self::DESCRIPTION;
    }
}