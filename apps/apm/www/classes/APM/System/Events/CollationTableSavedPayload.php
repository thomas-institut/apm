<?php

namespace APM\System\Events;

/**
 * Payload for a saved collation table.
 */
final readonly class CollationTableSavedPayload
{

    /**
     * Create a collation table save payload.
     *
     * @param int $userTid User entity ID that saved the collation table.
     * @param int $ctId Collation table entity ID.
     */
    public function __construct(public int $userTid, public int $ctId)
    {
    }
}