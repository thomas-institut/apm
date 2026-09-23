<?php

namespace APM\System\Events\Listeners;

use APM\System\Events\EventListener;
use APM\System\Events\PageSettingsUpdatedPayload;
use APM\System\Jobs\UpdateApiUsersTranscribedPagesDataJob;
use InvalidArgumentException;
use ThomasInstitut\JobQueue\JobQueueManager;

/**
 * Schedules user transcription data refreshes after page settings change.
 */
final readonly class PageSettingsUpdatedListener implements EventListener
{

    /**
     * Create the page settings listener.
     *
     * @param JobQueueManager $jobQueueManager Queue for user data refresh jobs.
     */
    public function __construct(private JobQueueManager $jobQueueManager)
    {
    }

    /**
     * Schedule a refresh for the user who changed page settings.
     *
     * @param object $payload A PageSettingsUpdatedPayload.
     * @throws InvalidArgumentException If the payload is not a page settings payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof PageSettingsUpdatedPayload) {
            throw new InvalidArgumentException('Expected a page settings update payload.');
        }

        $userTid = $payload->userTid;
        $this->jobQueueManager->scheduleJob(
            UpdateApiUsersTranscribedPagesDataJob::class,
            "User $userTid",
            ['userTid' => $userTid],
            0,
            3,
            20
        );
    }
}