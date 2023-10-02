<?php

namespace APM\System\Job;

/**
 * Parent class of job manager
 *
 * A job manager registers, schedules and process jobs
 */
abstract class JobQueueManager
{

    /**
     * Registers a job of the given name with the given JobHandlerInterface
     * @param string $name
     * @param JobHandlerInterface $job
     * @return bool
     */
    abstract public function registerJob(string $name, JobHandlerInterface $job): bool;

    /**
     * Schedules a new job
     * Returns the newly scheduled job's id
     * @param string $name
     * @param string $description
     * @param array $payload
     * @param int $secondsToWait
     * @param int $maxAttempts
     * @param int $secondBetweenRetries
     * @return int
     */

    abstract public function scheduleJob(string $name, string $description, array $payload, int $secondsToWait = 0, int $maxAttempts = 1, int $secondBetweenRetries = 5) : int;


    /**
     * Reschedules an existing job, possibly changing the job's max attempts and second between retries values.
     * If the job does not exist returns -1, otherwise returns the job's id
     * @param int $jobId
     * @param int $secondsToWait
     * @param int $maxAttempts  if not -1, changes the job's maxAttempts value
     * @param int $secondBetweenRetries if not -1, changes the job's secondBetweenRetries value
     * @return int
     */
    abstract public function rescheduleJob(int $jobId, int $secondsToWait = 0, int $maxAttempts = -1, int $secondBetweenRetries = -1): int;

    /**
     * Process the current job queue: runs all pending jobs
     * @return void
     */
    abstract public function process() : void;

    /**
     * Removes all finished jobs from the queue
     * @return void
     */
    abstract public function cleanQueue() : void;


    /**
     * Returns an array with the number of jobs for every possible state:
     *  [ 'waiting' => someInt, 'running' => someInt, .... ]
     * @return array
     */
    abstract public function getJobCountsByState() : array;

    /**
     * Returns job information for jobs with the given state
     * @param string $state
     * @return array
     */
    abstract public function getJobsByState(string $state) : array;
}