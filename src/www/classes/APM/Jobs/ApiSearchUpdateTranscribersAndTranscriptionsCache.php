<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateTranscribersAndTranscriptionsCache implements JobHandlerInterface

{
    public function run(SystemManager $sm, array $payload): bool
    {
        $config = $sm->getConfig();
        $client = ApiSearch::getTypesenseClient($config);
        return ApiSearch::updateDataCache($sm, $client, 'transcriptions');
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }

}