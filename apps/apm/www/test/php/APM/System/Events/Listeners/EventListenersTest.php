<?php

namespace APM\System\Events\Listeners;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use APM\System\Cache\CacheKey;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Events\CollationTableSavedPayload;
use APM\System\Events\DocumentAdded;
use APM\System\Events\DocumentChangedPayload;
use APM\System\Events\DocumentDeleted;
use APM\System\Events\DocumentUpdated;
use APM\System\Events\EntityDataChangedPayload;
use APM\System\Events\EventListener;
use APM\System\Events\EventManager;
use APM\System\Events\EventRegistry;
use APM\System\Events\PageSettingsUpdatedPayload;
use APM\System\Events\PersonDataChangedPayload;
use APM\System\Events\TranscriptionUpdated;
use APM\System\Events\TranscriptionUpdatedPayload;
use APM\System\Events\WorkChangedPayload;
use APM\System\Factories\EventRegistryFactory;
use APM\System\Jobs\UpdateAllPeopleDataCacheJob;
use APM\System\Jobs\UpdateApiDocumentsDataCacheJob;
use APM\System\Jobs\UpdateApiSearchEditionsIndexJob;
use APM\System\Jobs\UpdateApiSearchTranscribersAndTranscriptionsCacheJob;
use APM\System\Jobs\UpdateApiSearchTranscriptionsIndexJob;
use APM\System\Jobs\UpdateApiUsersCtDataForUserJob;
use APM\System\Jobs\UpdateApiUsersTranscribedPagesDataJob;
use APM\System\Jobs\UpdateWorksCacheJob;
use APM\System\Work\WorkData;
use APM\System\Work\WorkManager;
use APM\System\Work\WorkNotFoundException;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobQueueManager;

/**
 * Test event listeners preserve legacy job scheduling and cache behavior.
 */
class EventListenersTest extends TestCase
{

    /**
     * Test that transcription listener groups schedule the original jobs in registration order.
     */
    public function testTranscriptionListenersScheduleOrderedJobsWithLegacyArguments(): void
    {
        $jobQueueManager = $this->createMock(JobQueueManager::class);
        $scheduledJobs = [];
        $jobQueueManager->expects($this->exactly(5))
            ->method('scheduleJob')
            ->willReturnCallback(function (...$arguments) use (&$scheduledJobs): string {
                $scheduledJobs[] = $arguments;
                return '';
            });

        $listeners = [
            TranscriptionWorkAndDocumentCacheListener::class => new TranscriptionWorkAndDocumentCacheListener(
                $jobQueueManager
            ),
            TranscriptionUserDataListener::class => new TranscriptionUserDataListener($jobQueueManager),
            TranscriptionSearchListener::class => new TranscriptionSearchListener($jobQueueManager),
        ];
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->exactly(3))
            ->method('get')
            ->willReturnCallback(static function (string $id) use ($listeners): EventListener {
                return $listeners[$id];
            });
        $eventManager = new EventManager($container, EventRegistryFactory::create());

        $eventManager->emit(TranscriptionUpdated::class, new TranscriptionUpdatedPayload(17, 23, 5, 2));

        $this->assertSame([
            [UpdateWorksCacheJob::class, '', [
                'type' => 'transcription',
                'docId' => 23,
                'pageNumber' => 5,
                'columnNumber' => 2,
            ], 0, 3, 20],
            [UpdateApiDocumentsDataCacheJob::class, '', [23], 0, 3, 20],
            [UpdateApiUsersTranscribedPagesDataJob::class, 'User 17', ['userTid' => 17], 0, 3, 20],
            [UpdateApiSearchTranscriptionsIndexJob::class, '', ['doc_id' => 23, 'page' => 5, 'col' => 2], 0, 3, 20],
            [UpdateApiSearchTranscribersAndTranscriptionsCacheJob::class, '', [], 0, 3, 20],
        ], $scheduledJobs);
    }

    /**
     * Test that page settings and collation listeners schedule their original refresh jobs.
     */
    public function testPageSettingsAndCollationListenersScheduleExactJobs(): void
    {
        $pageSettingsJobs = [];
        $pageSettingsQueue = $this->createMock(JobQueueManager::class);
        $pageSettingsQueue->expects($this->once())
            ->method('scheduleJob')
            ->willReturnCallback(function (...$arguments) use (&$pageSettingsJobs): string {
                $pageSettingsJobs[] = $arguments;
                return '';
            });
        (new PageSettingsUpdatedListener($pageSettingsQueue))->handle(new PageSettingsUpdatedPayload(41, 56));
        $this->assertSame([
            [UpdateApiUsersTranscribedPagesDataJob::class, 'User 41', ['userTid' => 41], 0, 3, 20],
        ], $pageSettingsJobs);

        $collationJobs = [];
        $collationQueue = $this->createMock(JobQueueManager::class);
        $collationQueue->expects($this->exactly(3))
            ->method('scheduleJob')
            ->willReturnCallback(function (...$arguments) use (&$collationJobs): string {
                $collationJobs[] = $arguments;
                return '';
            });
        (new CollationTableSavedListener($collationQueue))->handle(new CollationTableSavedPayload(42, 57));
        $this->assertSame([
            [UpdateApiUsersCtDataForUserJob::class, 'User 42', ['userTid' => 42], 0, 3, 20],
            [UpdateApiSearchEditionsIndexJob::class, '', [57], 0, 3, 20],
            [UpdateApiSearchTranscribersAndTranscriptionsCacheJob::class, '', [], 0, 3, 20],
        ], $collationJobs);
    }

    /**
     * Test that document additions, updates, and deletions schedule document data refreshes.
     */
    public function testDocumentLifecycleEventsScheduleDocumentCacheRefresh(): void
    {
        $jobQueueManager = $this->createMock(JobQueueManager::class);
        $scheduledJobs = [];
        $jobQueueManager->expects($this->exactly(3))
            ->method('scheduleJob')
            ->willReturnCallback(function (...$arguments) use (&$scheduledJobs): string {
                $scheduledJobs[] = $arguments;
                return '';
            });
        $listener = new DocumentChangedListener($jobQueueManager);
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->exactly(3))->method('get')->willReturn($listener);
        $eventManager = new EventManager($container, EventRegistryFactory::create());

        $eventManager->emit(DocumentAdded::class, new DocumentChangedPayload(9, 101));
        $eventManager->emit(DocumentUpdated::class, new DocumentChangedPayload(9, 102));
        $eventManager->emit(DocumentDeleted::class, new DocumentChangedPayload(9, 103));

        $this->assertSame([
            [UpdateApiDocumentsDataCacheJob::class, '', [101], 0, 3, 20],
            [UpdateApiDocumentsDataCacheJob::class, '', [102], 0, 3, 20],
            [UpdateApiDocumentsDataCacheJob::class, '', [103], 0, 3, 20],
        ], $scheduledJobs);
    }

    /**
     * Test that entity change routing preserves scalar and array input order and event payload fields.
     */
    public function testEntityChangesRoutePeopleAndDocumentsInInputOrder(): void
    {
        $receivedEvents = [];
        $personListener = new EventPayloadRecordingListener(
            static function (object $payload) use (&$receivedEvents): void {
                $receivedEvents[] = ['person', $payload->personTid];
            }
        );
        $documentListener = new EventPayloadRecordingListener(
            static function (object $payload) use (&$receivedEvents): void {
                $receivedEvents[] = ['document', $payload->userTid, $payload->docId];
            }
        );
        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [EntityRoutingPersonListener::class, $personListener],
            [EntityRoutingDocumentListener::class, $documentListener],
        ]);
        $eventManager = new EventManager($container, new EventRegistry([
            \APM\System\Events\PersonDataChanged::class => [
                'payload' => PersonDataChangedPayload::class,
                'listeners' => [EntityRoutingPersonListener::class],
            ],
            DocumentUpdated::class => [
                'payload' => DocumentChangedPayload::class,
                'listeners' => [EntityRoutingDocumentListener::class],
            ],
        ]));
        $entitySystem = $this->createMock(ApmEntitySystemInterface::class);
        $entitySystem->expects($this->exactly(5))
            ->method('getEntityType')
            ->willReturnMap([
                [201, Entity::tPerson],
                [202, Entity::tDocument],
                [203, 9999],
                [204, Entity::tPerson],
                [205, Entity::tDocument],
            ]);
        $listener = new EntityDataChangedListener($entitySystem, $eventManager);

        $listener->handle(new EntityDataChangedPayload([201, 202, 203, 204], 77));
        $listener->handle(new EntityDataChangedPayload(205, 78));

        $this->assertSame([
            ['person', 201],
            ['document', 77, 202],
            ['person', 204],
            ['document', 78, 205],
        ], $receivedEvents);
    }

    /**
     * Test that person changes invalidate the affected people page part and schedule a full rebuild.
     */
    public function testPersonDataChangeInvalidatesPartAndSchedulesCacheRebuild(): void
    {
        $systemMainDataCache = $this->createMock(SystemMainDataCache::class);
        $systemMainDataCache->expects($this->once())
            ->method('get')
            ->with(CacheKey::ApiPeople_PeoplePageData_Parts)
            ->willReturn(serialize([[301]]));
        $systemMainDataCache->expects($this->once())
            ->method('delete')
            ->with(CacheKey::ApiPeople_PeoplePageData_PartPrefix . ':0');
        $entitySystem = $this->createStub(ApmEntitySystemInterface::class);
        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->once())->method('debug')->with('Invalidated ApiPeople data cache, part 0');
        $jobQueueManager = $this->createMock(JobQueueManager::class);
        $jobQueueManager->expects($this->once())
            ->method('scheduleJob')
            ->with(UpdateAllPeopleDataCacheJob::class, '', [], 0, 3, 20)
            ->willReturn('');

        $listener = new PersonDataChangedListener($entitySystem, $systemMainDataCache, $logger, $jobQueueManager);
        $listener->handle(new PersonDataChangedPayload(301));
    }

    /**
     * Test that work changes invalidate the current author's works cache.
     */
    public function testWorkChangeInvalidatesCurrentAuthorWorksCache(): void
    {
        $workData = new WorkData();
        $workData->authorId = 401;
        $workManager = $this->createMock(WorkManager::class);
        $workManager->expects($this->once())->method('getWorkData')->with(501)->willReturn($workData);
        $cache = $this->createMock(SystemMainDataCache::class);
        $cache->expects($this->once())->method('delete')->with(CacheKey::ApiPeopleWorksByPerson . 401);
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->once())->method('get')->with(SystemMainDataCache::class)->willReturn($cache);

        (new WorkChangedListener($workManager, $container))->handle(new WorkChangedPayload(501));
    }

    /**
     * Test that a missing work retains the legacy -1 fallback without resolving cache dependencies.
     */
    public function testMissingWorkUsesFallbackWithoutInvalidatingCache(): void
    {
        $workManager = $this->createMock(WorkManager::class);
        $workManager->expects($this->once())
            ->method('getWorkData')
            ->with(502)
            ->willThrowException(new WorkNotFoundException());
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->never())->method('get');

        (new WorkChangedListener($workManager, $container))->handle(new WorkChangedPayload(502));
    }
}

/**
 * Test event listener that records payloads through a callback.
 */
final class EventPayloadRecordingListener implements EventListener
{

    /**
     * Create a payload recording listener.
     *
     * @param \Closure(object): void $callback Callback invoked with each event payload.
     */
    public function __construct(private readonly \Closure $callback)
    {
    }

    /**
     * Pass the received payload to the recording callback.
     *
     * @param object $payload Event payload to record.
     */
    public function handle(object $payload): void
    {
        ($this->callback)($payload);
    }
}

/**
 * Class name used for routing person events in the listener test container.
 */
final class EntityRoutingPersonListener
{
}

/**
 * Class name used for routing document events in the listener test container.
 */
final class EntityRoutingDocumentListener
{
}