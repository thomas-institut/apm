<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use Throwable;

class ApiSearchUpdateEditorsAndEditionsCache implements JobHandlerInterface

{

    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {
        try {
            return ApiSearch::updateDataCache($sm, 'editions',  $sm->getLogger(), true);
        } catch (Throwable $e) {
            $sm->getLogger()->error("Error updating editors and editions cache: " . $e->getMessage());
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