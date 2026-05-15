<?php

namespace APM\Jobs;

use APM\CommandLine\IndexManager;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use Throwable;

class ApiSearchUpdateEditionsIndex extends ApiSearchUpdateTypesenseIndex implements JobHandlerInterface
{
    public function __construct(private SystemManager $sm) {}

    public function run(array $payload, string $jobName): bool
    {
        $config = $this->sm->getConfig();

        // Fetch data from payload
        $table_id = $payload[0];

        $im = new IndexManager($config, 0, []);
        $im->setIndexNamePrefix('editions');

        try {
            $im->updateOrAddItem($table_id);
            return true;
        } catch (Throwable $e) {
            $this->sm->getLogger()->error("Error updating editions index for table $table_id: " . $e->getMessage());
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