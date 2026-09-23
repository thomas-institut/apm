<?php

namespace APM\System\Events\Listeners;

use APM\System\Events\EventListener;
use APM\System\Events\TranscriptionUpdatedPayload;
use APM\System\Jobs\UpdateApiUsersTranscribedPagesDataJob;
use InvalidArgumentException;
use ThomasInstitut\JobQueue\JobQueueManager;

/**
 * Schedules a user transcription data refresh after a transcription update.
 */
final readonly class TranscriptionUserDataListener implements EventListener
{

    /**
     * Create the transcription user data listener.
     *
     * @param JobQueueManager $jobQueueManager Queue for user data refresh jobs.
     */
    public function __construct(private JobQueueManager $jobQueueManager)
    {
    }

    /**
     * Schedule a refresh for the user who transcribed.
     *
     * @param object $payload A TranscriptionUpdatedPayload.
     * @throws InvalidArgumentException If the payload is not a transcription update payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof TranscriptionUpdatedPayload) {
            throw new InvalidArgumentException('Expected a transcription update payload.');
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