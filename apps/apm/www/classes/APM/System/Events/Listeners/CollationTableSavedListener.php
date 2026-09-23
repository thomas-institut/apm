<?php

namespace APM\System\Events\Listeners;

use APM\System\Events\CollationTableSavedPayload;
use APM\System\Events\EventListener;
use APM\System\Jobs\UpdateApiSearchEditionsIndexJob;
use APM\System\Jobs\UpdateApiSearchTranscribersAndTranscriptionsCacheJob;
use APM\System\Jobs\UpdateApiUsersCtDataForUserJob;
use InvalidArgumentException;
use ThomasInstitut\JobQueue\JobQueueManager;

/**
 * Schedules user and search refreshes after a collation table is saved.
 */
final readonly class CollationTableSavedListener implements EventListener
{

    /**
     * Create the collation table listener.
     *
     * @param JobQueueManager $jobQueueManager Queue for user and search refresh jobs.
     */
    public function __construct(private JobQueueManager $jobQueueManager)
    {
    }

    /**
     * Schedule user collation data and search refreshes.
     *
     * @param object $payload A CollationTableSavedPayload.
     * @throws InvalidArgumentException If the payload is not a collation table payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof CollationTableSavedPayload) {
            throw new InvalidArgumentException('Expected a collation table saved payload.');
        }

        $userTid = $payload->userTid;
        $this->jobQueueManager->scheduleJob(
            UpdateApiUsersCtDataForUserJob::class,
            "User $userTid",
            ['userTid' => $userTid],
            0,
            3,
            20
        );
        $this->jobQueueManager->scheduleJob(UpdateApiSearchEditionsIndexJob::class, '', [$payload->ctId], 0, 3, 20);
        $this->jobQueueManager->scheduleJob(
            UpdateApiSearchTranscribersAndTranscriptionsCacheJob::class,
            '',
            [],
            0,
            3,
            20
        );
    }
}