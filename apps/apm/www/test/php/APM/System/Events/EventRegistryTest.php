<?php

namespace APM\System\Events;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

/**
 * Test event registration lookup and validation.
 */
class EventRegistryTest extends TestCase
{

    /**
     * Test that registrations retain their payload type and ordered listeners.
     */
    public function testGetRegistrationReturnsRegisteredEntry(): void
    {
        $registration = [
            'payload' => EventRegistryTestPayload::class,
            'listeners' => [EventRegistryTestFirstListener::class, EventRegistryTestSecondListener::class],
        ];
        $registry = new EventRegistry([EventRegistryTestEvent::class => $registration]);

        $this->assertSame($registration, $registry->getRegistration(EventRegistryTestEvent::class));
    }

    /**
     * Test that a missing event has no registration.
     */
    public function testGetRegistrationReturnsNullForUnknownEvent(): void
    {
        $registry = new EventRegistry();

        $this->assertNull($registry->getRegistration(EventRegistryTestEvent::class));
    }

    /**
     * Test that malformed event registrations are rejected at construction.
     */
    public function testConstructorRejectsMalformedRegistration(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid registration');

        new EventRegistry([
            EventRegistryTestEvent::class => [
                'payload' => '',
                'listeners' => [],
            ],
        ]);
    }

    /**
     * Test that listener entries must be non-empty class names.
     */
    public function testConstructorRejectsInvalidListenerClassName(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Listener class names');

        new EventRegistry([
            EventRegistryTestEvent::class => [
                'payload' => EventRegistryTestPayload::class,
                'listeners' => [''],
            ],
        ]);
    }
}

/**
 * Marker event used by EventRegistry tests.
 */
class EventRegistryTestEvent
{
}

/**
 * Payload class used by EventRegistry tests.
 */
class EventRegistryTestPayload
{
}

/**
 * First listener class name used by EventRegistry tests.
 */
class EventRegistryTestFirstListener
{
}

/**
 * Second listener class name used by EventRegistry tests.
 */
class EventRegistryTestSecondListener
{
}