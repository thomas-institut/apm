<?php

namespace APM\ApmWorker;

use APM\CommandLine\CommandLineUtility;

/**
 * CLI utility wrapper for ValkeyWorker.
 */
class ApmWorkerUtility extends CommandLineUtility
{
    /**
     * @param int $argc
     * @param array $argv
     */
    public function main($argc, $argv): void
    {
        if ($argc < 2) {
            $this->printErrorMsg("Usage: " . $argv[0] . " <instance_id> [<max_jobs>]");
            exit(1);
        }

        $instanceId = (int)$argv[1];
        $maxJobs = (int)($argv[2] ?? 100);

        $worker = new ValkeyWorker($this->getSystemManager(), $instanceId, $maxJobs);
        $worker->run();
    }
}
