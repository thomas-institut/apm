<?php

namespace APM\Jobs;

use APM\Site\SiteWorks;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class SiteWorksUpdateDataCache implements JobHandlerInterface
{
    public function run(SystemManager $sm, array $payload): bool
    {
        return SiteWorks::updateCachedWorkData($sm);
    }
    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}