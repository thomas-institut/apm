<?php

namespace APM\System\Jobs;

use APM\Api\ApiSearch;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Search\SearchIndexManager;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use Throwable;

final readonly class UpdateApiSearchTranscribersAndTranscriptionsCacheJob implements JobHandlerInterface

{
    public function __construct(
        private SearchIndexManager $searchIndexManager,
        private SystemMainDataCache $cache,
        private LoggerInterface $logger
    ) {}


    public function run(array $payload, string $jobName): bool
    {
        try {
            return ApiSearch::updateDataCache($this->searchIndexManager, $this->cache, 'transcriptions');
        }  catch (Throwable $e) {
            $this->logger->error("Error updating transcriptions and transcribers cache: " . $e->getMessage());
            return false;
        }

    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }

}