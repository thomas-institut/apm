<?php

namespace APM\Jobs;

use APM\CommandLine\IndexManager;
use APM\System\Job\JobHandlerInterface;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;

class ApiSearchUpdateEditionsIndex extends ApiSearchUpdateOpenSearchIndex implements JobHandlerInterface
{


    public function run(SystemManager $sm, array $payload): bool
    {
        $logger = $sm->getLogger();
        $config = $sm->getConfig();

        $client = $sm->getOpensearchClient();
        if ($client === null) {
            return false;
        }

        // Fetch data from payload
        $table_id = $payload[0];

        (new IndexManager($config, 0, [0, 'editions', 'update-add', $table_id]))->run();
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}
