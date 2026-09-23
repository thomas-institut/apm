<?php

namespace APM\System\Events\Listeners;

use APM\System\Events\DocumentChangedPayload;
use APM\System\Events\EventListener;
use APM\System\Jobs\UpdateApiDocumentsDataCacheJob;
use InvalidArgumentException;
use ThomasInstitut\JobQueue\JobQueueManager;

/**
 * Schedules document data cache refreshes after document lifecycle changes.
 */
final readonly class DocumentChangedListener implements EventListener
{

    /**
     * Create the document change listener.
     *
     * @param JobQueueManager $jobQueueManager Queue for document data refresh jobs.
     */
    public function __construct(private JobQueueManager $jobQueueManager)
    {
    }

    /**
     * Schedule a document data cache refresh.
     *
     * @param object $payload A DocumentChangedPayload.
     * @throws InvalidArgumentException If the payload is not a document change payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof DocumentChangedPayload) {
            throw new InvalidArgumentException('Expected a document change payload.');
        }

        $this->jobQueueManager->scheduleJob(UpdateApiDocumentsDataCacheJob::class, '', [$payload->docId], 0, 3, 20);
    }
}