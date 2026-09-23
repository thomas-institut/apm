<?php

namespace APM\System\Events;

/**
 * Payload for an updated page settings record.
 */
final readonly class PageSettingsUpdatedPayload
{

    /**
     * Create a page settings update payload.
     *
     * @param int $userTid User entity ID that made the update.
     * @param int $pageId Page entity ID.
     */
    public function __construct(public int $userTid, public int $pageId)
    {
    }
}