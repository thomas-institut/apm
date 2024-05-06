<?php


namespace APM\CommandLine\ApmCtlUtility;


use APM\CommandLine\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use PDO;

class CacheTool extends CommandLineUtility implements AdminUtility
{
    const CMD = 'cache';

    const USAGE = self::CMD . " <option>\n\nOptions:\n  info: print cache size, length, etc\n  flush: erases all cache entries\n  clean: removes all expired entries\n";
    const DESCRIPTION = "Cache management functions: info, clean, etc";
    const FLUSH_SAFE_WORD = 'IKnowWhatImDoing';

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);
    }

    private function getCacheTableName() : string {
        return $this->getSystemManager()->getTableNames()[ApmMySqlTableName::TABLE_SYSTEM_CACHE];
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

        $cacheTable = $this->getCacheTableName();

        $cacheSizeQuery = "SELECT sum(length(`value`)) AS size from `$cacheTable`";
        $cacheLengthQuery = "SELECT count(*) as length FROM `$cacheTable`";

        $cacheSize = $this->getSingleValue($cacheSizeQuery, 'size');
        $cacheLength = $this->getSingleValue($cacheLengthQuery, 'length');
        $msg = "Cache size: " . round((intval($cacheSize) / (1024*1024)), 2) . " MB, " . $cacheLength . " entries\n";

        $this->logger->info($msg);

    }

    private function deleteKey() : void {
        if ($this->argc < 3) {
            print "Need a cache key to delete\n";
            return;
        }

        $cacheKey = $this->argv[2];

        $this->getSystemManager()->getSystemDataCache()->delete($cacheKey);
        $this->logger->info("Cache key deleted: " . $cacheKey);
    }

    private function flushCache(): void
    {
        if ($this->argc < 3) {
            print "Please use 'cache flush <theSafeWord>' to actually flush the cache\n";
            return;
        }

        if ($this->argv[2] !== self::FLUSH_SAFE_WORD) {
            print "Sorry, you don't seem to know what you're doing\n";
            return;
        }

        $query = 'TRUNCATE ' . $this->getCacheTableName();
        $this->getDbConn()->query($query);
        $this->getSystemManager()->getMemDataCache()->clear();
        $this->logger->info("Cache flushed");

    }

    private function  getSingleValue(string $query, string $name) {
        $r = $this->getDbConn()->query($query);

        $rows = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            $rows[] = $row;
        }

        if (count($rows) === 0) {
            return '';
        }

        return $rows[0][$name];

    }

    private function cleanCache() : void
    {
        $this->getSystemManager()->getSystemDataCache()->clean();
        $this->logger->info('Cache cleaned');
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