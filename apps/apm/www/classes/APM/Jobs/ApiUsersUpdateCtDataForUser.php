<?php

namespace APM\Jobs;

use APM\Api\ApiUsers;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;

class ApiUsersUpdateCtDataForUser implements JobHandlerInterface
{
    public function __construct(private SystemManager $sm) {}

    public function run(array $payload, string $jobName): bool
    {
        if (!isset($payload['userTid'])) {
            return false;
        }
        return ApiUsers::updateCtInfoData($this->sm, $payload['userTid']);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}