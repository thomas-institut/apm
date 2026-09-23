<?php

namespace APM\System\Actions\UpdateApiDocumentsDataCache;

use APM\System\Actions\ActionInterface;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\Exception\DocumentNotFoundException;
use Exception;
use InvalidArgumentException;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataCache\ItemNotInCacheException;

/**
 * Updates the API documents data cache for a set of changed documents.
 */
final readonly class UpdateApiDocumentsDataCacheAction implements ActionInterface
{
    /**
     * Creates an action for updating the API documents data cache.
     *
     * @param SystemMainDataCache $cache
     * @param RebuildApiDocumentsDataCacheAction $rebuildAction
     * @param LoggerInterface $logger
     */
    public function __construct(
        private SystemMainDataCache $cache,
        private RebuildApiDocumentsDataCacheAction $rebuildAction,
        private LoggerInterface $logger
    ) {
    }

    /**
     * Updates the cache entries for the supplied document IDs.
     *
     * If the cache is missing, or no document IDs are supplied, the complete cache
     * is rebuilt instead.
     *
     * @param mixed $payload A list of document IDs.
     * @return bool Whether the cache was updated successfully.
     * @throws InvalidArgumentException If the payload is not an array.
     */
    public function execute(mixed $payload): bool
    {
        if (!is_array($payload)) {
            throw new InvalidArgumentException('Invalid payload');
        }

        $docIds = $payload;
        $data = [];
        $completeRebuild = count($docIds) === 0;

        if (!$completeRebuild) {
            try {
                $data = json_decode(
                    $this->cache->get(RebuildApiDocumentsDataCacheAction::DOCUMENT_DATA_CACHE_KEY),
                    true
                );
            } catch (ItemNotInCacheException) {
                $completeRebuild = true;
            }
        }

        if ($completeRebuild) {
            $this->logger->info('Rebuilding document data cache entirely');
            try {
                $data = $this->rebuildAction->execute([]);
            } catch (Exception $exception) {
                $this->logger->error(
                    'Exception while building DocumentData',
                    [
                        'code' => $exception->getCode(),
                        'msg' => $exception->getMessage(),
                    ]
                );
                return false;
            }

            // The rebuild action has already stored the complete cache.
            return true;
        }

        if (count($docIds) !== 0) {
            $updatedDocs = [];

            foreach ($data['docs'] as $docData) {
                if (in_array($docData['id'], $docIds)) {
                    try {
                        $newDocData = $this->rebuildAction->getDocumentData($docData['id']);
                    } catch (DocumentNotFoundException) {
                        // The document was deleted; leaving it out removes it from the cache.
                        continue;
                    }
                    $this->logger->info("Updating doc data for doc {$docData['id']}");
                    $updatedDocs[] = $newDocData;
                } else {
                    $updatedDocs[] = $docData;
                }
            }

            foreach ($docIds as $docId) {
                if (!in_array($docId, array_column($updatedDocs, 'id'))) {
                    $this->logger->info("Adding doc data for new doc $docId");
                    try {
                        $newDocData = $this->rebuildAction->getDocumentData($docId);
                    } catch (DocumentNotFoundException) {
                        // The document may have been deleted before this job ran.
                        continue;
                    }
                    $updatedDocs[] = $newDocData;
                }
            }

            $data['docs'] = $updatedDocs;
        }

        if (count($data) !== 0) {
            $this->cache->set(
                RebuildApiDocumentsDataCacheAction::DOCUMENT_DATA_CACHE_KEY,
                json_encode($data),
                RebuildApiDocumentsDataCacheAction::DOCUMENT_DATA_TTL
            );
        }

        return true;
    }
}
