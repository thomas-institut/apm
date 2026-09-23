<?php

namespace APM\System\Events;

/**
 * Payload for changed person data.
 */
final readonly class PersonDataChangedPayload
{

    /**
     * Create a person data change payload.
     *
     * @param int $personTid Person entity ID.
     */
    public function __construct(public int $personTid)
    {
    }
}