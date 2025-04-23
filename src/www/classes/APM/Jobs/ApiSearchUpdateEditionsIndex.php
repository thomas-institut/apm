<?php

namespace APM\Jobs;

use APM\CommandLine\IndexManager;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateEditionsIndex extends ApiSearchUpdateTypesenseIndex implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload): bool
    {
        $logger = $sm->getLogger();
        $config = $sm->getConfig();

        try {
            $this->initializeTypesenseClient($config);
        } catch (\Exception $e) {
            $logger->debug('Connecting to typesense server failed.');
            return false;
        }

        // Fetch data from payload
        $table_id = $payload[0];
        $argv = [0, 'editions', 'update-add', $table_id];

        (new IndexManager($config, 0, $argv))->run();
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}