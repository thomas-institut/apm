<?php

namespace APM\System\Events\Listeners;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\Events\DocumentChangedPayload;
use APM\System\Events\DocumentUpdated;
use APM\System\Events\EntityDataChangedPayload;
use APM\System\Events\EventListener;
use APM\System\Events\EventManager;
use APM\System\Events\PersonDataChanged;
use APM\System\Events\PersonDataChangedPayload;
use InvalidArgumentException;

/**
 * Routes generic entity changes to entity-specific events.
 */
final readonly class EntityDataChangedListener implements EventListener
{

    /**
     * Create the entity change routing listener.
     *
     * @param ApmEntitySystemInterface $entitySystem Looks up changed entity types.
     * @param EventManager $eventManager Dispatches nested entity-specific events.
     */
    public function __construct(
        private ApmEntitySystemInterface $entitySystem,
        private EventManager $eventManager
    ) {
    }

    /**
     * Emit person or document events for changed entities in input order.
     *
     * @param object $payload An EntityDataChangedPayload.
     * @throws EntityDoesNotExistException If an entity ID does not exist.
     * @throws InvalidArgumentException If the payload is not an entity change payload.
     */
    public function handle(object $payload): void
    {
        if (!$payload instanceof EntityDataChangedPayload) {
            throw new InvalidArgumentException('Expected an entity data change payload.');
        }

        $entities = is_int($payload->entityIdOrIds) ? [$payload->entityIdOrIds] : $payload->entityIdOrIds;
        foreach ($entities as $entityId) {
            $entityType = $this->entitySystem->getEntityType($entityId);
            if ($entityType === Entity::tPerson) {
                $this->eventManager->emit(
                    PersonDataChanged::class,
                    new PersonDataChangedPayload($entityId)
                );
            } elseif ($entityType === Entity::tDocument) {
                $this->eventManager->emit(
                    DocumentUpdated::class,
                    new DocumentChangedPayload($payload->userId, $entityId)
                );
            }
        }
    }
}