<?php

namespace APM\System\Search;

use APM\CollationTable\CollationTableManager;
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

class TypesenseSearchIndexManagerTest extends TestCase
{

    public function testUpdateIndexReturnsZeroWhenThereAreNoSourceItems(): void
    {
        $manager = $this->createManager();

        $result = $manager->updateIndex(IndexType::Transcriptions);

        $this->assertSame(0, $result->updatesNeeded);
        $this->assertSame(0, $result->updatesPerformed);
    }

    public function testUpdateIndexHandlesEditionSourceItemsSeparately(): void
    {
        $manager = $this->createManager();

        $result = $manager->updateIndex(IndexType::Editions, 1);

        $this->assertSame(0, $result->updatesNeeded);
        $this->assertSame(0, $result->updatesPerformed);
    }

    private function createManager(): TypesenseSearchIndexManager
    {
        return new TypesenseSearchIndexManager(
            $this->createStub(Client::class),
            $this->createStub(SystemMainDataCache::class),
            $this->createStub(LoggerInterface::class),
            $this->createStub(DocumentManager::class),
            $this->createStub(TranscriptionManager::class),
            $this->createStub(ApmEntitySystemInterface::class),
            $this->createStub(CollationTableManager::class),
            $this->createStub(WorkManager::class),
            $this->createStub(LemmatizerInterface::class),
            $this->createStub(LanguageManager::class),
        );
    }
}