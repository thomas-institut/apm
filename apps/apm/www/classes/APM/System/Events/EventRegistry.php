<?php

namespace APM\System\Events;

use InvalidArgumentException;

final class EventRegistry
{

    /**
     * @var array<class-string, array{payload: class-string, listeners: list<class-string>}>
     */
    private readonly array $registrations;

    /**
     * Create a registry of event payload types and ordered listener class names.
     *
     * @param array<class-string, array{payload: class-string, listeners: list<class-string>}> $registrations
     */
    public function __construct(array $registrations = [])
    {
        $normalizedRegistrations = [];

        foreach ($registrations as $eventClass => $registration) {
            if (!is_string($eventClass) || $eventClass === '') {
                throw new InvalidArgumentException('Event class names must be non-empty strings.');
            }

            if (!is_array($registration)
                || !isset($registration['payload'])
                || !is_string($registration['payload'])
                || $registration['payload'] === ''
                || !isset($registration['listeners'])
                || !is_array($registration['listeners'])
                || !array_is_list($registration['listeners'])) {
                throw new InvalidArgumentException(sprintf('Invalid registration for event "%s".', $eventClass));
            }

            foreach ($registration['listeners'] as $listenerClass) {
                if (!is_string($listenerClass) || $listenerClass === '') {
                    throw new InvalidArgumentException(
                        sprintf('Listener class names for event "%s" must be non-empty strings.', $eventClass)
                    );
                }
            }

            $normalizedRegistrations[$eventClass] = [
                'payload' => $registration['payload'],
                'listeners' => $registration['listeners'],
            ];
        }

        /** @var array<class-string, array{payload: class-string, listeners: list<class-string>}> $normalizedRegistrations */
        $this->registrations = $normalizedRegistrations;
    }

    /**
     * Get the payload and listener registration for an event.
     *
     * @param string $eventClass The event marker class name.
     * @return array{payload: class-string, listeners: list<class-string>}|null
     */
    public function getRegistration(string $eventClass): ?array
    {
        return $this->registrations[$eventClass] ?? null;
    }
}