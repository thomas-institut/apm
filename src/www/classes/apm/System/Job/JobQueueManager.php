<?php

namespace APM\System\Job;

/**
 * Parent class of job manager
 *
 * A job manager registers, schedules and process jobs
 */
abstract class JobQueueManager
{

    abstract public function registerJob(string $name, JobHandlerInterface $job): bool;

    abstract public function scheduleJob(string $name, string $description, array $payload, int $secondsToWait = 0, int $maxAttempts = 1, int $secondBetweenRetries = 5) : int;

    abstract public function process();

    abstract public function cleanQueue();
}