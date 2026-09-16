<?php

namespace APM\System\Actions;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\Actions\UpdateApiDocumentsDataCache\RebuildApiDocumentsDataCacheAction;
use APM\System\Actions\UpdateApiDocumentsDataCache\UpdateApiDocumentsDataCacheAction;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\DocumentManager;
use APM\System\Transcription\TranscriptionManager;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

class UpdateApiDocumentsDataCacheActionTest extends TestCase
{
    /**
     * Creates the document and transcription services used by the action tests.
     *
     * @return array{0: DocumentManager, 1: TranscriptionManager}
     */
    private function createDocumentServices(): array
    {
        $documentManager = $this->createStub(DocumentManager::class);
        $documentManager->method('getLegacyDocId')->willReturn(100);
        $documentManager->method('getDocPageCount')->willReturn(4);
        $documentManager->method('getLegacyDocInfo')->willReturn(['title' => 'Test document']);

        $transcriptionManager = $this->createStub(TranscriptionManager::class);
        $transcriptionManager->method('getTranscribedPageListByDocId')->willReturn([1, 2]);
        $transcriptionManager->method('getEditorIdsByDocId')->willReturn([200]);

        return [$documentManager, $transcriptionManager];
    }

    /**
     * Creates a rebuild action with the given cache.
     */
    private function createRebuildAction(SystemMainDataCache $cache): RebuildApiDocumentsDataCacheAction
    {
        [$documentManager, $transcriptionManager] = $this->createDocumentServices();
        $entitySystem = $this->createStub(ApmEntitySystemInterface::class);
        $entitySystem->method('getAllEntitiesForType')->willReturn([10]);

        return new RebuildApiDocumentsDataCacheAction(
            $entitySystem,
            $documentManager,
            $transcriptionManager,
            $cache,
            new NullLogger()
        );
    }

    /**
     * Tests that a rebuild creates document data and stores it in the cache.
     */
    public function testRebuildStoresCompleteDocumentData(): void
    {
        $data = [
            'docs' => [[
                'numPages' => 4,
                'numTranscribedPages' => 2,
                'transcribers' => [200],
                'docInfo' => ['title' => 'Test document'],
                'id' => 10,
            ]],
        ];
        $cache = $this->createMock(SystemMainDataCache::class);
        $cache->expects($this->once())
            ->method('set')
            ->with(
                RebuildApiDocumentsDataCacheAction::DOCUMENT_DATA_CACHE_KEY,
                json_encode($data),
                RebuildApiDocumentsDataCacheAction::DOCUMENT_DATA_TTL
            );

        $action = $this->createRebuildAction($cache);

        $this->assertSame($data, $action->execute([]));
    }

    /**
     * Tests that an update replaces changed data while retaining other documents.
     */
    public function testUpdateReplacesChangedDocumentData(): void
    {
        $cachedData = [
            'docs' => [
                ['id' => 10, 'numPages' => 1],
                ['id' => 20, 'numPages' => 2],
            ],
        ];
        $updatedData = [
            'docs' => [
                [
                    'numPages' => 4,
                    'numTranscribedPages' => 2,
                    'transcribers' => [200],
                    'docInfo' => ['title' => 'Test document'],
                    'id' => 10,
                ],
                ['id' => 20, 'numPages' => 2],
            ],
        ];

        $cache = $this->createMock(SystemMainDataCache::class);
        $cache->expects($this->once())
            ->method('get')
            ->with(RebuildApiDocumentsDataCacheAction::DOCUMENT_DATA_CACHE_KEY)
            ->willReturn(json_encode($cachedData));
        $cache->expects($this->once())
            ->method('set')
            ->with(
                RebuildApiDocumentsDataCacheAction::DOCUMENT_DATA_CACHE_KEY,
                json_encode($updatedData),
                RebuildApiDocumentsDataCacheAction::DOCUMENT_DATA_TTL
            );

        $rebuildAction = $this->createRebuildAction($cache);
        $action = new UpdateApiDocumentsDataCacheAction($cache, $rebuildAction, new NullLogger());

        $this->assertTrue($action->execute([10]));
    }
}
