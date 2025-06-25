<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateEditorsAndEditionsCache implements JobHandlerInterface

{
    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {
        return ApiSearch::updateDataCache($sm, 'editions',  $sm->getLogger());
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}