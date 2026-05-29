<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;

class ApiSearchUpdateTranscribersAndTranscriptionsCache implements JobHandlerInterface

{
    public function __construct(private SystemManager $sm) {}

    /**
     * @throws \Throwable
     */
    public function run(array $payload, string $jobName): bool
    {
        return ApiSearch::updateDataCache($this->sm, 'transcriptions', $this->sm->getLogger());
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }

}