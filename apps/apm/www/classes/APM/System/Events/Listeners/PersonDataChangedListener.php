<?php

namespace APM\System\Events\Listeners;

use APM\Api\ApiPeople;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Events\EventListener;
use APM\System\Events\PersonDataChangedPayload;
use APM\System\Jobs\UpdateAllPeopleDataCacheJob;
use InvalidArgumentException;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobQueueManager;

/**
 * Invalidates affected people data and schedules the aggregate cache rebuild.
 */
final readonly class PersonDataChangedListener implements EventListener
{

    /**
     * Create the person data change listener.
     *
     * @param ApmEntitySystemInterface $entitySystem Source for people page data.
     * @param SystemMainDataCache $systemMainDataCache Cache containing people page data.
     * @param LoggerInterface $logger Logger for cache invalidation information.
     * @param JobQueueManager $jobQueueManager Queue for the full people cache rebuild.
     */
    public function __construct(
        private ApmEntitySystemInterface $entitySystem,
        private SystemMainDataCache $systemMainDataCache,
        private LoggerInterface $logger,
        private JobQueueManager $jobQueueManager
    ) {
    }

    /**
     * Invalidate the changed person's page cache and schedule a full cache refresh.
     *
     * @param object $payload A PersonDataChangedPayload.
     * @throws InvalidArgumentException If the payload is not a person change payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof PersonDataChangedPayload) {
            throw new InvalidArgumentException('Expected a person data change payload.');
        }

        $part = ApiPeople::onPersonDataChanged(
            $payload->personTid,
            $this->entitySystem,
            $this->systemMainDataCache,
            $this->logger
        );
        $this->logger->debug("Invalidated ApiPeople data cache, part $part");
        $this->jobQueueManager->scheduleJob(UpdateAllPeopleDataCacheJob::class, '', [], 0, 3, 20);
    }
}