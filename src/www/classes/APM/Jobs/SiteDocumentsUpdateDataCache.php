<?php

namespace APM\Jobs;

use APM\Site\SiteDocuments;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class SiteDocumentsUpdateDataCache implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload): bool
    {
       return SiteDocuments::updateDataCache($sm);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }
}