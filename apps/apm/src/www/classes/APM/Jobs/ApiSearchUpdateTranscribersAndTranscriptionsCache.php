<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;

class ApiSearchUpdateTranscribersAndTranscriptionsCache implements JobHandlerInterface

{
    /**
     * @throws \Throwable
     */
    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {
        return ApiSearch::updateDataCache($sm, 'transcriptions', $sm->getLogger());
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }

}