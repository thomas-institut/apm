<?php

namespace APM\System\Events;

/**
 * Payload for one or more changed entities.
 */
final readonly class EntityDataChangedPayload
{

    /**
     * Create an entity data change payload.
     *
     * @param int|int[] $entityIdOrIds A single entity ID or entity IDs in their original order.
     * @param int $userId User entity ID associated with the change.
     */
    public function __construct(public int|array $entityIdOrIds, public int $userId)
    {
    }
}