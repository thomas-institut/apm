<?php

namespace APM\System\Job;

use APM\System\SystemManager;

/**
 * A job that does not do anything, for testing purposes
 */
class NullJobHandler implements JobHandlerInterface
{

    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {
       return $payload['returnValue'] ?? false;
    }

    public function mustBeUnique(): bool
    {
       return true;
    }

    public function minTimeBetweenSchedules(): int
    {
        return 0;
    }
}