<?php

namespace APM\System\Factories;

use APM\System\Events\CollationTableSaved;
use APM\System\Events\CollationTableSavedPayload;
use APM\System\Events\DocumentAdded;
use APM\System\Events\DocumentChangedPayload;
use APM\System\Events\DocumentDeleted;
use APM\System\Events\DocumentUpdated;
use APM\System\Events\EntityDataChanged;
use APM\System\Events\EntityDataChangedPayload;
use APM\System\Events\EventRegistry;
use APM\System\Events\PageSettingsUpdated;
use APM\System\Events\PageSettingsUpdatedPayload;
use APM\System\Events\PersonDataChanged;
use APM\System\Events\PersonDataChangedPayload;
use APM\System\Events\TranscriptionUpdated;
use APM\System\Events\TranscriptionUpdatedPayload;
use APM\System\Events\WorkAdded;
use APM\System\Events\WorkChangedPayload;
use APM\System\Events\WorkDeleted;
use APM\System\Events\WorkUpdated;
use APM\System\Events\Listeners\CollationTableSavedListener;
use APM\System\Events\Listeners\DocumentChangedListener;
use APM\System\Events\Listeners\EntityDataChangedListener;
use APM\System\Events\Listeners\PageSettingsUpdatedListener;
use APM\System\Events\Listeners\PersonDataChangedListener;
use APM\System\Events\Listeners\TranscriptionSearchListener;
use APM\System\Events\Listeners\TranscriptionUserDataListener;
use APM\System\Events\Listeners\TranscriptionWorkAndDocumentCacheListener;
use APM\System\Events\Listeners\WorkChangedListener;

class EventRegistryFactory
{

    /**
     * Create the application's event registrations and their ordered listeners.
     *
     * @return EventRegistry
     */
    public static function create(): EventRegistry
    {
        return new EventRegistry([
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
}