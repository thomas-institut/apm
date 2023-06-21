<?php

namespace APM\Jobs;

use APM\Api\ApiUsers;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiUsersUpdateTranscribedPagesData implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload): bool
    {
        if (!isset($payload['userId'])) {
            return false;
        }
        return ApiUsers::updateTranscribedPagesData($sm, $payload['userId']);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }
}