<?php

namespace ThomasInstitut\JobQueue;

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
     * Returns the newly scheduled job's id.
     *
     * If there's any problem, returns empty string and logs the error
     *
     * @param string $name
     * @param string $description
     * @param array $payload
     * @param int $secondsToWait
     * @param int $maxAttempts
     * @param int $secondBetweenRetries
     * @return string
     */

    abstract public function scheduleJob(string $name, string $description, array $payload, int $secondsToWait = 0, int $maxAttempts = 1, int $secondBetweenRetries = 5): string;


    /**
     * Reschedules an existing job, possibly changing the job's max attempts and second between retries values.
     * If the job does not exist returns empty string, otherwise returns the job's id
     * @param string $jobId
     * @param int $secondsToWait
     * @param int $maxAttempts if not -1, changes the job's maxAttempts value
     * @param int $secondBetweenRetries if not -1, changes the job's secondBetweenRetries value
     * @return string
     */
    abstract public function rescheduleJob(string $jobId, int $secondsToWait = 0, int $maxAttempts = -1, int $secondBetweenRetries = -1): string;

    /**
     * Process the current job queue: runs all pending jobs
     * @return void
     */
    abstract public function process(): void;

    /**
     * Removes all finished jobs from the queue
     * @return void
     */
    abstract public function cleanQueue(): void;


    /**
     * Returns an array with the number of jobs for every possible state:
     *  [ 'waiting' => someInt, 'running' => someInt, .... ]
     * @return array
     */
    abstract public function getJobCountsByState(): array;

    /**
     * Returns job information for jobs with the given state
     * @param string $state
     * @return array
     */
    abstract public function getJobsByState(string $state): array;

    /**
     * Returns true if a job with the given name and payload is already scheduled (waiting or running)
     *
     * @param string $name
     * @param string $description
     * @param array $payload
     * @return bool
     */
    abstract public function isJobActive(string $name, string $description, array $payload): bool;

    /**
     * Returns statistics about completed and failed jobs per day
     * @return JobStats
     */
    abstract public function getJobStats(): JobStats;

    /**
     * Resets all job statistics
     * @return void
     */
    abstract public function resetJobStats(): void;
}