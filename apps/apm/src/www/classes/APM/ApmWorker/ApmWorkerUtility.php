<?php

namespace APM\ApmWorker;

use APM\CommandLine\CommandLineUtility;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;

/**
 * CLI utility wrapper for ValkeyWorker.
 */
class ApmWorkerUtility extends CommandLineUtility
{
    /**
     * @param int $argc
     * @param array $argv
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function main($argc, $argv): void
    {
        if ($argc < 2) {
            $this->printErrorMsg("Usage: " . $argv[0] . " <instance_id> [<max_jobs>] [<db_reset_interval_in_mins>]");
            exit(1);
        }
        $instanceId = (int)$argv[1];
        $maxJobs = (int)($argv[2] ?? ValkeyWorker::DefaultMaxJobs);
        $dbResetInterval = (int)($argv[3] ?? ValkeyWorker::DefaultDbConnectionResetIntervalInMinutes);
        $worker = new ValkeyWorker($this->container, $instanceId, $maxJobs, $dbResetInterval);
        $worker->run();
    }
}
