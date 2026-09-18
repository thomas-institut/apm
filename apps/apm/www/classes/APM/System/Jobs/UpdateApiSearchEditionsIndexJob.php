<?php

namespace APM\System\Jobs;

use APM\System\Search\SearchIndexManager;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use Throwable;

readonly class UpdateApiSearchEditionsIndexJob implements JobHandlerInterface
{
    public function __construct(
        private SearchIndexManager $searchIndexManager,
        private LoggerInterface    $logger
    )
    {
    }

    public function run(array $payload, string $jobName): bool
    {
        try {
            $this->searchIndexManager->updateEditionInIndex($payload[0]);
            return true;
        } catch (Throwable $e) {
            $this->logger->error("Error updating editions index for table $payload[0]: " . $e->getMessage());
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