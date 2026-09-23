<?php

namespace APM\System\Events;

use APM\System\Events\Listeners\CollationTableSavedListener;
use APM\System\Events\Listeners\DocumentChangedListener;
use APM\System\Events\Listeners\EntityDataChangedListener;
use APM\System\Events\Listeners\PageSettingsUpdatedListener;
use APM\System\Events\Listeners\PersonDataChangedListener;
use APM\System\Events\Listeners\TranscriptionSearchListener;
use APM\System\Events\Listeners\TranscriptionUserDataListener;
use APM\System\Events\Listeners\TranscriptionWorkAndDocumentCacheListener;
use APM\System\Events\Listeners\WorkChangedListener;
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
     * Create the application's event registrations and their ordered listeners.
     *
     * @return self
     */
    public static function createDefault(): self
    {
        return new self([
            TranscriptionUpdated::class => [
                'payload' => TranscriptionUpdatedPayload::class,
                'listeners' => [
                    TranscriptionWorkAndDocumentCacheListener::class,
                    TranscriptionUserDataListener::class,
                    TranscriptionSearchListener::class,
                ],
            ],
            PageSettingsUpdated::class => [
                'payload' => PageSettingsUpdatedPayload::class,
                'listeners' => [PageSettingsUpdatedListener::class],
            ],
            CollationTableSaved::class => [
                'payload' => CollationTableSavedPayload::class,
                'listeners' => [CollationTableSavedListener::class],
            ],
            DocumentAdded::class => [
                'payload' => DocumentChangedPayload::class,
                'listeners' => [DocumentChangedListener::class],
            ],
            DocumentUpdated::class => [
                'payload' => DocumentChangedPayload::class,
                'listeners' => [DocumentChangedListener::class],
            ],
            DocumentDeleted::class => [
                'payload' => DocumentChangedPayload::class,
                'listeners' => [DocumentChangedListener::class],
            ],
            EntityDataChanged::class => [
                'payload' => EntityDataChangedPayload::class,
                'listeners' => [EntityDataChangedListener::class],
            ],
            PersonDataChanged::class => [
                'payload' => PersonDataChangedPayload::class,
                'listeners' => [PersonDataChangedListener::class],
            ],
            WorkAdded::class => [
                'payload' => WorkChangedPayload::class,
                'listeners' => [WorkChangedListener::class],
            ],
            WorkUpdated::class => [
                'payload' => WorkChangedPayload::class,
                'listeners' => [WorkChangedListener::class],
            ],
            WorkDeleted::class => [
                'payload' => WorkChangedPayload::class,
                'listeners' => [WorkChangedListener::class],
            ],
        ]);
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