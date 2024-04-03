<?php

namespace APM\Jobs;

use APM\Api\ApiPeople;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiPeopleUpdateAllPeopleEssentialData implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload): bool
    {
        return ApiPeople::updateCachedAllPeopleEssentialData($sm);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }
    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}