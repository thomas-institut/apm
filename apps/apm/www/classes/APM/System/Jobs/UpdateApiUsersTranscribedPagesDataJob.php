<?php

namespace APM\System\Jobs;

use APM\Api\ApiUsers;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\DocumentManager;
use APM\System\Transcription\TranscriptionManager;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;

readonly class UpdateApiUsersTranscribedPagesDataJob implements JobHandlerInterface
{
    public function __construct(
        private DocumentManager      $documentManager,
        private TranscriptionManager $transcriptionManager,
        private LoggerInterface      $logger,
        private SystemMainDataCache  $systemMainDataCache
    )
    {
    }

    public function run(array $payload, string $jobName): bool
    {
        if (!isset($payload['userTid'])) {
            return false;
        }
        return ApiUsers::updateTranscribedPagesData($payload['userTid'], $this->documentManager, $this->transcriptionManager, $this->logger, $this->systemMainDataCache);
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