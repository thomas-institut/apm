<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateTranscribersAndTitlesCache implements JobHandlerInterface

{
    public function run(SystemManager $sm, array $payload): bool
    {
        return ApiSearch::updateDataCache($sm);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

}