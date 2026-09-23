<?php

namespace APM\System\Events;

interface EventListener
{

    /**
     * Handle an event payload.
     *
     * @param object $payload The payload registered for the emitted event.
     */
    public function handle(object $payload): void;
}