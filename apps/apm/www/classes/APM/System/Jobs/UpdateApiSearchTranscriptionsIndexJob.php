<?php

namespace APM\System\Jobs;


use APM\System\Search\SearchIndexManager;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use Throwable;

readonly class UpdateApiSearchTranscriptionsIndexJob implements JobHandlerInterface
{
    public function __construct(
        private SearchIndexManager $searchIndexManager,
        private LoggerInterface    $logger
    )
    {
    }

    /**
     * @param array $payload
     * @param string $jobName
     * @return bool
     */
    public function run(array $payload, string $jobName): bool
    {
        // Fetch data from payload
        $docId = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];
        try {
            $this->searchIndexManager->updateTranscriptionInIndex($docId, $page, $col);
            return true;
        } catch (Throwable $e) {
            $this->logger->error("Error updating transcription index for $docId page $page col $col: " . $e->getMessage());
            return false;
        }
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules(): int
    {
        return 2;
    }
}
