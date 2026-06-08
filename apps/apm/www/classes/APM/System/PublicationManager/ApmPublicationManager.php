<?php

namespace APM\System\PublicationManager;

use APM\EntitySystem\Schema\Entity;
use APM\System\ApmImageType;
use APM\NodeService\GenEditionPublicationInputData;
use APM\NodeService\NodeServiceClient;
use APM\CollationTable\CollationTableManager;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\LanguageManager;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TranscriptionManager;
use APM\System\Transcription\TxText\ChunkMark;
use APM\System\Transcription\TxText\Item;
use CuyZ\Valinor\Mapper\MappingError;
use Exception;
use InvalidArgumentException;
use Predis\Client;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\ApmPublicationApi\Client\CustomMapperErrorException;
use ThomasInstitut\ApmPublicationApi\Client\EditionPublicationDataMapper;
use ThomasInstitut\ApmPublicationApi\EditionPublication\EditionPublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionColumn;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;
use ThomasInstitut\ApmPublicationApi\TranscriptionPage;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\TimeString;

class ApmPublicationManager implements PublicationManagerInterface
{

    private const string valkeyPrefix = 'APM:PublicationManager:';

    public function __construct(private readonly DocumentManager          $dm,
                                private readonly TranscriptionManager     $tm,
                                private readonly LanguageManager          $lm,
                                private readonly MultiChunkEditionManager $mceManager,
                                private readonly CollationTableManager    $ctManager,
                                private readonly NodeServiceClient        $nodeServiceClient,
                                private readonly LoggerInterface          $logger,
                                private readonly array                    $imageSources,
                                private readonly Client                   $valkeyClient
    )
    {

    }

    public function list(): array
    {
        $ids = $this->valkeyClient->smembers(self::valkeyPrefix . 'pubs');
        $listings = [];
        foreach ($ids as $id) {
            $pubFields = $this->valkeyClient->hgetall(self::valkeyPrefix . 'pub:' . $id);
            if ($pubFields) {
                $listing = new PublicationListing();
                $listing->id = (int)$id;
                $listing->type = PublicationType::from($pubFields['type']);
                $listing->title = $pubFields['title'];
                $listing->versionTimeString = $pubFields['versionTimeString'];
                $listing->description = $pubFields['description'] ?? '';
                $listings[] = $listing;
            }
        }
        return $listings;
    }

    public function getPublication(int $id): PublicationData
    {
        $data = $this->valkeyClient->hget(self::valkeyPrefix . 'pub:' . $id, 'data');
        if (!$data) {
            throw new PublicationNotFoundException("Publication with ID $id not found");
        }
        return unserialize($data);
    }

    public function updatePublication(int $id, string $version = 'current'): void
    {
        $pubKey = self::valkeyPrefix . 'pub:' . $id;
        $pubFields = $this->valkeyClient->hgetall($pubKey);
        if (!$pubFields) {
            throw new PublicationNotFoundException("Publication with ID $id not found");
        }
        $type = $pubFields['type'];
        $resourceId = (int)$pubFields['resourceId'];

        if ($type === PublicationType::Transcription->value) {
            try {
                $data = $this->getTranscriptionDataForDocument($resourceId, $version);
                $data->id = $id;
                $this->valkeyClient->hset($pubKey, 'data', serialize($data));
                $this->valkeyClient->hset($pubKey, 'title', $data->title);
                $this->valkeyClient->hset($pubKey, 'versionTimeString', $data->versionTimeString);
                $this->valkeyClient->hset($pubKey, 'description', $data->description ?? '');
            } catch (DocumentNotFoundException|PageNotFoundException $e) {
                throw new ResourceNotFoundException("Resource not found: " . $e->getMessage(), 0, $e);
            } catch (InvalidTimeStringException $e) {
                throw new RuntimeException("Invalid time string: " . $e->getMessage(), 0, $e);
            }
        } elseif ($type === PublicationType::Edition->value) {
                try {
                    $editionData = $this->mapEditionData($resourceId, $id);
                } catch (RuntimeException|MappingError $e) {
                    throw new ResourceNotFoundException("Error updating edition publication: " . $e->getMessage(), 0, $e);
                }

            $this->valkeyClient->hset($pubKey, 'data', serialize($editionData));
                $this->valkeyClient->hset($pubKey, 'title', $editionData->title);
                $this->valkeyClient->hset($pubKey, 'versionTimeString', $editionData->versionTimeString);
                $this->valkeyClient->hset($pubKey, 'description', $editionData->description ?? '');
        } else {
            throw new InvalidArgumentException("Publication type '$type' is not supported for update");
        }
    }

    public function deletePublication(int $id): void
    {
        $pubKey = self::valkeyPrefix . 'pub:' . $id;
        if (!$this->valkeyClient->exists($pubKey)) {
            throw new PublicationNotFoundException("Publication with ID $id not found");
        }
        $this->valkeyClient->transaction(function ($tx) use ($id, $pubKey) {
            $tx->del([$pubKey]);
            $tx->srem(self::valkeyPrefix . 'pubs', $id);
        });
    }

    private function getDocTypeString(int $type): string
    {
        return match ($type) {
            Entity::DocTypeManuscript => 'Manuscript',
            Entity::DocTypeIncunabulum => 'Incunabulum',
            Entity::DocTypePrint => 'Print',
            default => 'Unknown'
        };
    }

    public function createPublication(string $type, int $resourceId, string $version = 'current', bool $dryRun = false): PublicationData
    {
        if ($type === PublicationType::Transcription->value) {
            try {
                $data = $this->getTranscriptionDataForDocument($resourceId, $version);
                $id = Tid::generateUnique();
                $data->id = $id;
                if ($dryRun) {
                    return $data;
                }

                $this->valkeyClient->transaction(function ($tx) use ($id, $data, $type, $resourceId) {
                    $pubKey = self::valkeyPrefix . 'pub:' . $id;
                    $tx->hset($pubKey, 'data', serialize($data));
                    $tx->hset($pubKey, 'type', $type);
                    $tx->hset($pubKey, 'resourceId', (string)$resourceId);
                    $tx->hset($pubKey, 'title', $data->title);
                    $tx->hset($pubKey, 'versionTimeString', $data->versionTimeString);
                    $tx->hset($pubKey, 'description', $data->description ?? '');

                    $tx->sadd(self::valkeyPrefix . 'pubs', [$id]);
                });

                return $data;
            } catch (DocumentNotFoundException|PageNotFoundException $e) {
                throw new ResourceNotFoundException("Resource not found: " . $e->getMessage(), 0, $e);
            } catch (InvalidTimeStringException $e) {
                throw new RuntimeException("Invalid time string: " . $e->getMessage(), 0, $e);
            }

        }

        if ($type === PublicationType::Edition->value) {
            try {
                $id = Tid::generateUnique();
                $publicationData = $this->mapEditionData($resourceId, $id);

                if ($dryRun) {
                    return $publicationData;
                }

                $this->valkeyClient->transaction(function ($tx) use ($id, $publicationData, $type, $resourceId) {
                    $pubKey = self::valkeyPrefix . 'pub:' . $id;
                    $tx->hset($pubKey, 'data', serialize($publicationData));
                    $tx->hset($pubKey, 'type', $type);
                    $tx->hset($pubKey, 'resourceId', (string)$resourceId);
                    $tx->hset($pubKey, 'title', $publicationData->title);
                    $tx->hset($pubKey, 'versionTimeString', $publicationData->versionTimeString);
                    $tx->hset($pubKey, 'description', $publicationData->description ?? '');

                    $tx->sadd(self::valkeyPrefix . 'pubs', [$id]);
                });

                return $publicationData;
            } catch (RuntimeException|MappingError $e) {
                throw new ResourceNotFoundException("Error creating edition publication: " . $e->getMessage(), 0, $e);
            }
        }

        throw new InvalidArgumentException("Publication type '$type' is not supported");
    }

    /**
     * @throws MappingError
     */
    private function mapEditionData(int $resourceId, int $id): EditionPublicationData
    {
        $rawEditionData = $this->getEditionDataForMce($resourceId, $id);
        $this->logger->debug("Retrieved edition data for resource ID: $resourceId");

        $rawEditionData['id'] = $id;
        $rawEditionData['type'] = PublicationType::Edition->value;
        try {
            return EditionPublicationDataMapper::map($rawEditionData);
        } catch (CustomMapperErrorException $e) {
            $this->logger->error("Error mapping edition data: " . $e->getMessage());
            throw new RuntimeException("Error mapping edition data: " . $e->getMessage(), 0, $e);
        }

    }

    private function getEditionDataForMce(int $resourceId, int $publicationId): array
    {
        $inputData = $this->getMceDataForNodeService($resourceId, $publicationId);
        try {
            $data =  $this->nodeServiceClient->generateEditionPublication($inputData);
            if (isset($data['error']) && $data['error']) {
                throw new RuntimeException("Node service returned error: {$data['errorMsg']}");
            }
            return $data;
        } catch (Exception $e) {
            throw new RuntimeException("Node service failed: " . $e->getMessage(), 0, $e);
        }
    }

    private function getMceDataForNodeService(int $mceId, int $publicationId): GenEditionPublicationInputData
    {
        $this->logger->debug("Retrieving MCE data for edition ID $mceId");
        $mceDataInfo = $this->mceManager->getMultiChunkEditionById($mceId);
        $versionString = $mceDataInfo['validFrom'];
        $mceData = $mceDataInfo['mceData'];
        $this->logger->debug("Retrieved MCE data for edition ID $mceId, version: $versionString, chunks count: " . count($mceData['chunks']));
        $chunksCtData = [];

        foreach ($mceData['chunks'] as $chunkIndex => $chunk) {
            $singleChunkEditionId = $chunk['chunkEditionTableId'];
            $this->logger->debug("Retrieving chunk CT data for chunk index $chunkIndex, edition ID $singleChunkEditionId");
            $chunkCtData = $this->ctManager->getCollationTableById($singleChunkEditionId);
            $chunksCtData[$chunkIndex] = $chunkCtData;
        }

        $inputData = new GenEditionPublicationInputData();
        $inputData->editionId = $mceId;
        $inputData->publicationId = $publicationId;
        $inputData->mceData = $mceData;
        $inputData->versionString = $versionString;
        $inputData->chunksCtData = $chunksCtData;

        return $inputData;
    }

    /**
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     * @throws InvalidTimeStringException
     */
    private function getTranscriptionDataForDocument(int $docId, string $version = 'current'): TranscriptionData
    {
        $docInfo = $this->dm->getDocInfo($docId, true);
        if ($version === 'current') {
            $version = TimeString::now();
        }
        if (!TimeString::isValid($version)) {
            throw new InvalidTimeStringException("Invalid time string: $version");
        }

        $data = new TranscriptionData();

        $data->id = $docInfo->id;
        $data->type = PublicationType::Transcription;
        $data->title = $docInfo->title;
        $data->languageCode = $this->lm->getLanguageCode($docInfo->language) ?? '';
        $data->documentName = $docInfo->title;
        $data->docType = $this->getDocTypeString($docInfo->type ?? -1);
        $data->versionTimeString = $version;
        $data->description = '';

        // TODO: determine the last version before the requested version, this is the actual time the data changed

        $pages = [];
        foreach ($docInfo->pageIds as $pageId) {
            $txPage = new TranscriptionPage();
            $pageInfo = $this->dm->getPageInfo($pageId);
            $txPage->foliation = $pageInfo->foliation;
            $txPage->pageNumber = $pageInfo->sequence;
            $txPage->isTextPage = $pageInfo->type === Entity::PageTypeText || $pageInfo->type === Entity::PageTypeNotSet;
            $txPage->imageUrl = $this->dm->getImageUrl($docId, $pageInfo->imageNumber, ApmImageType::IMAGE_TYPE_JPG, $this->imageSources);
            $txPage->thumbnailUrl = $this->dm->getImageUrl($docId, $pageInfo->imageNumber, ApmImageType::IMAGE_TYPE_JPG_THUMBNAIL, $this->imageSources);
            $txPage->columns = [];
            // TODO add image url
            for ($i = 0; $i < $pageInfo->numCols; $i++) {
                $txCol = new TranscriptionColumn();
                $elements = $this->tm->getColumnElementsByPageId($pageId, $i + 1, $version);
                $txCol->transcriptionText = $this->getTranscriptionTextFromElements($elements);
                $txPage->columns[] = $txCol;
            }
            $pages[] = $txPage;
        }
        $data->pages = $pages;
        return $data;
    }

    /**
     * @param Element[] $elements
     * @return string
     */
    private function getTranscriptionTextFromElements(array $elements): string
    {
        $text = '';
        foreach ($elements as $element) {
            if ($element->type === Element::LINE) {
                foreach ($element->items as $item) {
                    switch($item->type) {
                        case Item::CHUNK_MARK:
                            /** @var ChunkMark $item */
                            $segment = $item->getChunkSegment();
                            $startMark = 'Start ';
                            $endMark = '';
                            if ($item->getType() === ChunkMark::CHUNK_END) {
                                $startMark = '';
                                $endMark = ' end';
                            }
                            if ($segment === 1) {
                                $text .= sprintf("[%s%s-%d%s]", $startMark, $item->getDareId(), $item->getChunkNumber(), $endMark);
                            } else {
                                $text .= sprintf("[%s%s-%d-%d%s]", $startMark, $item->getDareId(), $item->getChunkNumber(), $segment, $endMark);
                            }
                            break;


                        case Item::NO_WORD_BREAK:
                            $text .= '-';
                            break;

                        default:
                            $text .= $item->theText;
                    }
                }
                $text .= "\n";
            }
        }
        return trim($text);
    }

}