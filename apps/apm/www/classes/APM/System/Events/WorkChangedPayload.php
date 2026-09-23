<?php

namespace APM\System\Events;

/**
 * Payload shared by work added, updated, and deleted events.
 */
final readonly class WorkChangedPayload
{

    /**
     * Create a work change payload.
     *
     * @param int $workId Work entity ID.
     */
    public function __construct(public int $workId)
    {
    }
}