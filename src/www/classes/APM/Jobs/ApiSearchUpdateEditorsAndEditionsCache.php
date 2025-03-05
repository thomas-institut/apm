<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\Api\ApiSearch_Typesense;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateEditorsAndEditionsCache implements JobHandlerInterface

{
    public function run(SystemManager $sm, array $payload): bool
    {
        return ApiSearch_Typesense::updateDataCache($sm, 'editions');
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}