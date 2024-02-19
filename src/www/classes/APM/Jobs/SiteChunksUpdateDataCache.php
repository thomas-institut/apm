<?php

namespace APM\Jobs;

use APM\Site\SiteWorks;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class SiteChunksUpdateDataCache implements JobHandlerInterface
{
    public function run(SystemManager $sm, array $payload): bool
    {
        return SiteWorks::updateDataCache($sm);
    }
    public function mustBeUnique(): bool
    {
        return true;
    }
}