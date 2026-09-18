<?php

namespace APM\System\Search;

use APM\CollationTable\CollationTableManager;
use APM\CollationTable\CollationTableVersionInfo;
use APM\CollationTable\TableInfo;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\DocumentManager;
use APM\System\LanguageManager;
use APM\System\Lemmatizer\LemmatizerInterface;
use APM\System\Transcription\TranscriptionManager;
use APM\System\Work\WorkManager;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Typesense\Client;
use Typesense\Collection;
use Typesense\Collections;
use Typesense\Document;
use Typesense\Documents;

class TypesenseSearchIndexManagerTest extends TestCase
{

    public function testUpdateIndexReturnsZeroWhenThereAreNoSourceItems(): void
    {
        $manager = $this->createManager();

        $result = $manager->updateIndex(IndexType::Transcriptions);

        $this->assertSame(0, $result->updatesNeeded);
        $this->assertSame(0, $result->updatesPerformed);
        $this->assertSame(0, $result->deletionsPerformed);
    }

    public function testUpdateIndexHandlesEditionSourceItemsSeparately(): void
    {
        $manager = $this->createManager();

        $result = $manager->updateIndex(IndexType::Editions, 1);

        $this->assertSame(0, $result->updatesNeeded);
        $this->assertSame(0, $result->updatesPerformed);
        $this->assertSame(0, $result->deletionsPerformed);
    }

    public function testUpdateIndexDeletesOrphanedEditionEntries(): void
    {
        $documents = $this->createMock(Documents::class);
        $documents->expects($this->exactly(3))
            ->method('search')
            ->with($this->callback(function (array $query): bool {
                return ($query['q'] ?? null) === '*' &&
                    ($query['query_by'] ?? null) === 'table_id' &&
                    ($query['include_fields'] ?? null) === 'table_id';
            }))
            ->willReturnOnConsecutiveCalls(
                ['hits' => [['document' => ['id' => 'orphan', 'table_id' => '99']]]],
                ['hits' => []],
                ['hits' => []],
            );
        $indexedDocument = $this->createMock(Document::class);
        $indexedDocument->expects($this->once())->method('delete');
        $documents->method('offsetGet')->willReturn($indexedDocument);

        $manager = $this->createManager($this->createTypesenseClient($documents));

        $result = $manager->updateIndex(IndexType::Editions, -1);

        $this->assertSame(0, $result->updatesNeeded);
        $this->assertSame(0, $result->updatesPerformed);
        $this->assertSame(1, $result->deletionsPerformed);
    }

    public function testUpdateIndexDeletesOrphanedTranscriptionEntries(): void
    {
        $documents = $this->createMock(Documents::class);
        $documents->expects($this->exactly(3))
            ->method('search')
            ->with($this->callback(function (array $query): bool {
                return ($query['q'] ?? null) === '*' &&
                    ($query['query_by'] ?? null) === 'pageID' &&
                    ($query['include_fields'] ?? null) === 'pageID,column';
            }))
            ->willReturnOnConsecutiveCalls(
                ['hits' => [['document' => ['id' => 'orphan', 'pageID' => '99', 'column' => '2']]]],
                ['hits' => []],
                ['hits' => []],
            );
        $indexedDocument = $this->createMock(Document::class);
        $indexedDocument->expects($this->once())->method('delete');
        $documents->method('offsetGet')->willReturn($indexedDocument);

        $manager = $this->createManager($this->createTypesenseClient($documents));

        $result = $manager->updateIndex(IndexType::Transcriptions, -1);

        $this->assertSame(0, $result->updatesNeeded);
        $this->assertSame(0, $result->updatesPerformed);
        $this->assertSame(1, $result->deletionsPerformed);
    }

    public function testUpdateIndexDoesNotLoadEditionDataWhenEntryIsMissingAndLimitIsZero(): void
    {
        $tableInfo = new TableInfo();
        $tableInfo->id = 42;
        $tableInfo->type = 'edition';

        $collationTableManager = $this->createMock(CollationTableManager::class);
        $collationTableManager->expects($this->once())
            ->method('getTablesInfo')
            ->willReturn([$tableInfo]);
        $collationTableManager->expects($this->never())->method('getCollationTableById');
        $collationTableManager->expects($this->never())->method('getCollationTableVersionManager');

        $documents = $this->createMock(Documents::class);
        $documents->expects($this->exactly(6))
            ->method('search')
            ->with($this->callback(function (array $query): bool {
                return ($query['q'] ?? null) === '*' ||
                    (($query['limit'] ?? null) === 1 &&
                        ($query['include_fields'] ?? null) === 'timeFrom,edition_tokens,edition_lemmata');
            }))
            ->willReturn(['hits' => []]);

        $manager = $this->createManager(
            $this->createTypesenseClient($documents),
            $collationTableManager
        );

        $result = $manager->updateIndex(IndexType::Editions);

        $this->assertSame(1, $result->updatesNeeded);
        $this->assertSame(0, $result->updatesPerformed);
        $this->assertSame(0, $result->deletionsPerformed);
    }

    public function testUpdateIndexDoesNotLoadEditionDataWhenIndexedEntryIsCurrent(): void
    {
        $tableInfo = new TableInfo();
        $tableInfo->id = 42;
        $tableInfo->type = 'edition';

        $versionInfo = new CollationTableVersionInfo();
        $versionInfo->timeFrom = '2024-01-01 00:00:00';
        $versionManager = $this->createMock(\APM\CollationTable\CollationTableVersionManager::class);
        $versionManager->expects($this->once())
            ->method('getCollationTableVersionInfo')
            ->with(42, 1)
            ->willReturn([$versionInfo]);

        $collationTableManager = $this->createMock(CollationTableManager::class);
        $collationTableManager->method('getTablesInfo')->willReturn([$tableInfo]);
        $collationTableManager->expects($this->never())->method('getCollationTableById');
        $collationTableManager->method('getCollationTableVersionManager')->willReturn($versionManager);

        $documents = $this->createMock(Documents::class);
        $documents->expects($this->exactly(6))
            ->method('search')
            ->with($this->callback(function (array $query): bool {
                return ($query['q'] ?? null) === '*' ||
                    (($query['limit'] ?? null) === 1 &&
                        ($query['include_fields'] ?? null) === 'timeFrom,edition_tokens,edition_lemmata');
            }))
            ->willReturn([
                'hits' => [[
                    'document' => [
                        'timeFrom' => '2024-01-01 00:00:00',
                        'edition_tokens' => ['token'],
                        'edition_lemmata' => ['lemma'],
                    ],
                ]],
            ]);

        $manager = $this->createManager(
            $this->createTypesenseClient($documents),
            $collationTableManager
        );

        $result = $manager->updateIndex(IndexType::Editions);

        $this->assertSame(0, $result->updatesNeeded);
        $this->assertSame(0, $result->updatesPerformed);
        $this->assertSame(0, $result->deletionsPerformed);
    }

    private function createManager(
        ?Client $client = null,
        ?CollationTableManager $collationTableManager = null
    ): TypesenseSearchIndexManager
    {
        return new TypesenseSearchIndexManager(
            $client ?? $this->createTypesenseClient($this->createStub(Documents::class)),
            $this->createStub(SystemMainDataCache::class),
            $this->createStub(LoggerInterface::class),
            $this->createStub(DocumentManager::class),
            $this->createStub(TranscriptionManager::class),
            $this->createStub(ApmEntitySystemInterface::class),
            $collationTableManager ?? $this->createStub(CollationTableManager::class),
            $this->createStub(WorkManager::class),
            $this->createStub(LemmatizerInterface::class),
            $this->createStub(LanguageManager::class),
        );
    }

    private function createTypesenseClient(Documents $documents): Client
    {
        $collection = $this->createStub(Collection::class);
        $collection->documents = $documents;

        $collections = $this->createStub(Collections::class);
        $collections->method('offsetGet')->willReturn($collection);

        $client = new Client([
            'api_key' => 'test',
            'nodes' => [[
                'host' => 'localhost',
                'port' => 8108,
                'protocol' => 'http',
            ]],
        ]);
        $client->collections = $collections;

        return $client;
    }
}