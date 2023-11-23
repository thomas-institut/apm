<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateEditorsAndEditionsCache implements JobHandlerInterface

{
    public function run(SystemManager $sm, array $payload): bool
    {
        return ApiSearch::updateDataCache($sm, 'editions');
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

}