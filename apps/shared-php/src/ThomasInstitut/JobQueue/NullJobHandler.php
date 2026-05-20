<?php

namespace ThomasInstitut\JobQueue;

/**
 * A job that does not do anything, for testing purposes
 */
class NullJobHandler implements JobHandlerInterface
{

    public function run(array $payload, string $jobName): bool
    {
       return $payload['returnValue'] ?? false; // @codeCoverageIgnore
    }

    public function mustBeUnique(): bool
    {
       return true; // @codeCoverageIgnore
    }

    public function minTimeBetweenSchedules(): int
    {
        return 0; // @codeCoverageIgnore
    }
}