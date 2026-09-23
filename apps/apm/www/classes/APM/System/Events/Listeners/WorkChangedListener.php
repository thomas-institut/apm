<?php

namespace APM\System\Events\Listeners;

use APM\Api\ApiPeople;
use APM\System\Events\EventListener;
use APM\System\Events\WorkChangedPayload;
use APM\System\Work\WorkManager;
use APM\System\Work\WorkNotFoundException;
use InvalidArgumentException;
use Psr\Container\ContainerInterface;

/**
 * Invalidates the current author's works cache after a work change.
 */
final readonly class WorkChangedListener implements EventListener
{

    /**
     * Create the work change listener.
     *
     * @param WorkManager $workManager Retrieves current work data.
     * @param ContainerInterface $container Provides dependencies to the legacy API cache helper.
     */
    public function __construct(
        private WorkManager $workManager,
        private ContainerInterface $container
    ) {
    }

    /**
     * Invalidate the current author's works cache.
     *
     * @param object $payload A WorkChangedPayload.
     * @throws InvalidArgumentException If the payload is not a work change payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof WorkChangedPayload) {
            throw new InvalidArgumentException('Expected a work change payload.');
        }

        try {
            $personId = $this->workManager->getWorkData($payload->workId)->authorId;
        } catch (WorkNotFoundException) {
            $personId = -1;
        }

        // TODO: find previous author and invalidate cache too!
        ApiPeople::invalidateWorksByPersonCache($this->container, $personId);
    }
}