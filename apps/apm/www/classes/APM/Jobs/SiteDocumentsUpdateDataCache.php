<?php

namespace APM\Jobs;

use APM\Site\SiteDocuments;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;

readonly class SiteDocumentsUpdateDataCache implements JobHandlerInterface
{
    public function __construct(private SystemManager $sm) {}

    public function run(array $payload, string $jobName): bool
    {
       return SiteDocuments::updateDataCache($this->sm, $payload);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}