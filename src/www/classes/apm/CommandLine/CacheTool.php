<?php


namespace APM\CommandLine;


use APM\System\ApmMySqlTableName;
use PDO;

class CacheTool extends  CommandLineUtility implements AdminUtility
{
    const CMD = 'cache';

    const USAGE = self::CMD . " <option>\n\nOptions:\n  info: print cache size, length, etc\n  flush: erases all cache entries\n   clean: removes all expired entries\n";
    const DESCRIPTION = "Cache management functions: info, clean, etc";
    const FLUSH_SAFE_WORD = 'IKnowWhatImDoing';
    private string $cacheTable;

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);

        $this->cacheTable = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_SYSTEM_CACHE];
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

           default:
               print "Unrecognized option: "  . $argv[1] ."\n";
               return 0;
       }
       return 1;
    }

    private function printCacheInfo(): void
    {

        $cacheSizeQuery = "SELECT sum(length(`value`)) AS size from `$this->cacheTable`";
        $cacheLengthQuery = "SELECT count(*) as length FROM `$this->cacheTable`";

        $cacheSize = $this->getSingleValue($cacheSizeQuery, 'size');
        $cacheLength = $this->getSingleValue($cacheLengthQuery, 'length');
        $msg = "Cache size: " . round((intval($cacheSize) / (1024*1024)), 2) . " MB, " . $cacheLength . " entries\n";

        $this->logger->info($msg);

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

        $query = 'TRUNCATE ' . $this->cacheTable;
        $this->dbConn->query($query);

        $this->logger->info("Cache flushed");

    }

    private function  getSingleValue(string $query, string $name) {
        $r = $this->dbConn->query($query);

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
        $this->systemManager->getSystemDataCache()->clean();
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