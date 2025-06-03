<?php

namespace APM\Jobs;

use APM\CommandLine\IndexManager;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use ThomasInstitut\DataTable\InvalidTimeStringException;

class ApiSearchUpdateEditionsIndex extends ApiSearchUpdateTypesenseIndex implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload): bool
    {
        $logger = $sm->getLogger();
        $config = $sm->getConfig();

        // Fetch data from payload
        $table_id = $payload[0];

        $im = new IndexManager($config, 0, []);
        $im->setIndexNamePrefix('editions');

        try {
            $im->updateOrAddItem($table_id);
            return true;
        } catch (EntityDoesNotExistException|DocumentNotFoundException|PageNotFoundException|InvalidTimeStringException $e) {
            $sm->getLogger()->error("Error updating editions index for table $table_id: " . $e->getMessage());
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