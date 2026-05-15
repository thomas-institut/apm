<?php

namespace APM\Jobs;

use APM\Site\SiteDocuments;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;

class SiteDocumentsUpdateDataCache implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {
       return SiteDocuments::updateDataCache($sm, $payload);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}