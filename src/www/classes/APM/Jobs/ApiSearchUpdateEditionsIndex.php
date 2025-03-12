<?php

namespace APM\Jobs;

use APM\CommandLine\IndexManager;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use Exception;

class ApiSearchUpdateEditionsIndex extends ApiSearchUpdateOpenSearchIndex implements JobHandlerInterface
{


    public function run(SystemManager $sm, array $payload): bool
    {
        $config = $sm->getConfig();

        $client = $sm->getOpensearchClient();
        if ($client === null) {
            return false;
        }

        $sm->getLogger()->debug("Updating EditionsIndex", [ 'payload' => $payload ]);

        // Fetch data from payload
        $table_id = $payload[0];

        $args = [0, 'editions', 'update-add', $table_id];
        $argc = count($args);

        try {
            return (new IndexManager($config, $argc, $args))->main($argc, $args);
        } catch (Exception $e) {
            $sm->getLogger()->error("Exception", [ 'message' => $e->getMessage() ]);
            return false;
        }
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}
