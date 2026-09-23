<?php

namespace APM\System\Actions\UpdateApiDocumentsDataCache;

use APM\Api\ApiDocuments;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use APM\System\Actions\ActionInterface;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Transcription\TranscriptionManager;
use Psr\Log\LoggerInterface;

/**
 * Rebuilds and stores the complete API documents data cache.
 */
final readonly class RebuildApiDocumentsDataCacheAction implements ActionInterface
{
    public const string DOCUMENT_DATA_CACHE_KEY = ApiDocuments::DOCUMENT_DATA_CACHE_KEY;
    public const int DOCUMENT_DATA_TTL = ApiDocuments::DOCUMENT_DATA_TTL;

    /**
     * Creates an action for rebuilding the API documents data cache.
     *
     * @param ApmEntitySystemInterface $entitySystem
     * @param DocumentManager $documentManager
     * @param TranscriptionManager $transcriptionManager
     * @param SystemMainDataCache $cache
     * @param LoggerInterface $logger
     */
    public function __construct(
        private ApmEntitySystemInterface $entitySystem,
        private DocumentManager $documentManager,
        private TranscriptionManager $transcriptionManager,
        private SystemMainDataCache $cache,
        private LoggerInterface $logger
    ) {
    }

    /**
     * Rebuilds the document data and stores it in the system cache.
     *
     * @param mixed $payload Unused; the complete cache is always rebuilt.
     * @return array{docs: array<int, array<string, mixed>>}
     */
    public function execute(mixed $payload): array
    {
        $data = $this->buildDocumentData();
        $this->cache->set(self::DOCUMENT_DATA_CACHE_KEY, json_encode($data), self::DOCUMENT_DATA_TTL);

        return $data;
    }

    /**
     * Returns the cached-data representation of one document.
     *
     * @param int $docId
     * @return array<string, mixed>
     * @throws DocumentNotFoundException
     */
    public function getDocumentData(int $docId): array
    {
        $legacyDocId = $this->documentManager->getLegacyDocId($docId);

        return [
            'numPages' => $this->documentManager->getDocPageCount($docId),
            'numTranscribedPages' => count(
                $this->transcriptionManager->getTranscribedPageListByDocId($legacyDocId)
            ),
            'transcribers' => $this->transcriptionManager->getEditorIdsByDocId($legacyDocId),
            'docInfo' => $this->documentManager->getLegacyDocInfo($docId),
            'id' => $docId,
        ];
    }

    /**
     * Builds data for all documents currently known to the entity system.
     *
     * @return array{docs: array<int, array<string, mixed>>}
     */
    private function buildDocumentData(): array
    {
        $docs = [];

        foreach ($this->entitySystem->getAllEntitiesForType(Entity::tDocument) as $docId) {
            try {
                $docs[] = $this->getDocumentData($docId);
            } catch (DocumentNotFoundException $exception) {
                // A document disappearing while the cache is built should not abort the rebuild.
                $this->logger->error('Document not found: ' . $exception->getMessage());
            }
        }

        return ['docs' => $docs];
    }
}
