<?php


namespace APM\CommandLine;


use APM\System\ApmMySqlTableName;
use PDO;

class CacheTool extends  CommandLineUtility
{

    const USAGE = "cache <option>\n\nOptions:\n  info: print cache size, length, etc\n  flush: erases all cache entries\n";
    const FLUSH_SAFE_WORD = 'IKnowWhatImDoing';
    private $cacheTable;

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);

        $this->cacheTable = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_SYSTEM_CACHE];
    }

    protected function main($argc, $argv)
    {
       if ($argc === 1) {
           print self::USAGE . "\n";
           return false;
       }

       switch($argv[1]) {
           case 'info':
               $this->printCacheInfo();
               break;

           case 'flush':
               $this->flushCache();
               break;


           default:
               print "Unrecognized option: "  . $argv[1] ."\n";
               return false;
       }
    }

    private function printCacheInfo() {

        $cacheSizeQuery = "SELECT sum(length(value)) AS size from $this->cacheTable";
        $cacheLengthQuery = "SELECT count(*) as length FROM $this->cacheTable";

        $cacheSize = $this->getSingleValue($cacheSizeQuery, 'size');
        $cacheLength = $this->getSingleValue($cacheLengthQuery, 'length');
        $msg = "Cache size: " . round((intval($cacheSize) / (1024*1024)), 2) . " MB, " . $cacheLength . " entries\n";

        $this->logger->info($msg);

    }

    private function flushCache() {
        if ($this->argc < 3) {
            print "Please use 'cache flush <theSafeWord>' to actually flush the cache\n";
            return false;
        }

        if ($this->argv[2] !== self::FLUSH_SAFE_WORD) {
            print "Sorry, you don't seem to know what you're doing\n";
            return false;
        }

        $query = 'TRUNCATE ' . $this->cacheTable;
        $r = $this->dbConn->query($query);

        $this->logger->info("Cache flushed");

    }

    private function  getSingleValue($query, $name) {
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
}