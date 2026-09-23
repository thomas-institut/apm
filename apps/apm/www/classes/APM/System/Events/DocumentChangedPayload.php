<?php

namespace APM\System\Events;

/**
 * Payload shared by document added, updated, and deleted events.
 */
final readonly class DocumentChangedPayload
{

    /**
     * Create a document change payload.
     *
     * @param int $userTid User entity ID associated with the change.
     * @param int $docId Document entity ID.
     */
    public function __construct(public int $userTid, public int $docId)
    {
    }
}