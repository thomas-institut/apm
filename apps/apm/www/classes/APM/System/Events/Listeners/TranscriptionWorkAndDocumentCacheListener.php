<?php

namespace APM\System\Events\Listeners;

use APM\System\Events\EventListener;
use APM\System\Events\TranscriptionUpdatedPayload;
use APM\System\Jobs\UpdateApiDocumentsDataCacheJob;
use APM\System\Jobs\UpdateWorksCacheJob;
use InvalidArgumentException;
use ThomasInstitut\JobQueue\JobQueueManager;

/**
 * Schedules work and document cache refreshes after a transcription update.
 */
final readonly class TranscriptionWorkAndDocumentCacheListener implements EventListener
{

    /**
     * Create the transcription work and document cache listener.
     *
     * @param JobQueueManager $jobQueueManager Queue for cache refresh jobs.
     */
    public function __construct(private JobQueueManager $jobQueueManager)
    {
    }

    /**
     * Schedule work and document cache refreshes.
     *
     * @param object $payload A TranscriptionUpdatedPayload.
     * @throws InvalidArgumentException If the payload is not a transcription update payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof TranscriptionUpdatedPayload) {
            throw new InvalidArgumentException('Expected a transcription update payload.');
        }

        $this->jobQueueManager->scheduleJob(UpdateWorksCacheJob::class, '', [
            'type' => 'transcription',
            'docId' => $payload->docId,
            'pageNumber' => $payload->pageNumber,
            'columnNumber' => $payload->columnNumber,
        ], 0, 3, 20);
        $this->jobQueueManager->scheduleJob(UpdateApiDocumentsDataCacheJob::class, '', [$payload->docId], 0, 3, 20);
    }
}