<?php

namespace APM\Jobs;

use APM\Api\ApiPeople;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;

class ApiPeopleUpdateAllPeopleEssentialData implements JobHandlerInterface
{
    public function __construct(private SystemManager $sm) {}

    public function run(array $payload, string $jobName): bool
    {
        return ApiPeople::updateCachedAllPeopleDataForPeoplePage($this->sm);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }
    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}