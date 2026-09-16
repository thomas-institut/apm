<?php

namespace APM\System\Jobs;

use APM\Api\ApiUsers;
use APM\CollationTable\CollationTableManager;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Person\PersonManagerInterface;
use APM\System\Work\WorkManager;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;

readonly class UpdateApiUsersCtDataForUserJob implements JobHandlerInterface
{
    public function __construct(
        private CollationTableManager $collationTableManager,
        private WorkManager $workManager,
        private PersonManagerInterface $personManager,
        private SystemMainDataCache $systemMainDataCache,
        private LoggerInterface $logger
    ) {}

    public function run(array $payload, string $jobName): bool
    {
        if (!isset($payload['userTid'])) {
            return false;
        }
        return ApiUsers::updateCtInfoData($payload['userTid'], $this->collationTableManager, $this->workManager, $this->personManager,$this->systemMainDataCache, $this->logger);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}