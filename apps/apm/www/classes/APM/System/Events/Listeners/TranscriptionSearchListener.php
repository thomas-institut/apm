<?php

namespace APM\System\Events\Listeners;

use APM\System\Events\EventListener;
use APM\System\Events\TranscriptionUpdatedPayload;
use APM\System\Jobs\UpdateApiSearchTranscribersAndTranscriptionsCacheJob;
use APM\System\Jobs\UpdateApiSearchTranscriptionsIndexJob;
use InvalidArgumentException;
use ThomasInstitut\JobQueue\JobQueueManager;

/**
 * Schedules search index and transcriber cache refreshes after a transcription update.
 */
final readonly class TranscriptionSearchListener implements EventListener
{

    /**
     * Create the transcription search listener.
     *
     * @param JobQueueManager $jobQueueManager Queue for search refresh jobs.
     */
    public function __construct(private JobQueueManager $jobQueueManager)
    {
    }

    /**
     * Schedule transcription search index and cache refreshes.
     *
     * @param object $payload A TranscriptionUpdatedPayload.
     * @throws InvalidArgumentException If the payload is not a transcription update payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof TranscriptionUpdatedPayload) {
            throw new InvalidArgumentException('Expected a transcription update payload.');
        }

        $this->jobQueueManager->scheduleJob(
            UpdateApiSearchTranscriptionsIndexJob::class,
            '',
            ['doc_id' => $payload->docId, 'page' => $payload->pageNumber, 'col' => $payload->columnNumber],
            0,
            3,
            20
        );
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