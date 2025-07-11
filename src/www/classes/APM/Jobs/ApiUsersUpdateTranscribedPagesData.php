<?php

namespace APM\Jobs;

use APM\Api\ApiUsers;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiUsersUpdateTranscribedPagesData implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {
        if (!isset($payload['userTid'])) {
            return false;
        }
        return ApiUsers::updateTranscribedPagesData($sm, $payload['userTid']);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }
    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}