<?php

namespace APM\Jobs;

use APM\Api\ApiSearch_Typesense;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateTranscribersAndTranscriptionsCache implements JobHandlerInterface

{
    public function run(SystemManager $sm, array $payload): bool
    {
        return ApiSearch::updateDataCache($sm, 'transcriptions');
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }

}