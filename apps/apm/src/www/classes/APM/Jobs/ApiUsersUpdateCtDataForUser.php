<?php

namespace APM\Jobs;

use APM\Api\ApiUsers;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;

class ApiUsersUpdateCtDataForUser implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {
        if (!isset($payload['userTid'])) {
            return false;
        }
        return ApiUsers::updateCtInfoData($sm, $payload['userTid']);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}