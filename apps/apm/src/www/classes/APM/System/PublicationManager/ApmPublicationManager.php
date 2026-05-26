<?php

namespace APM\System\PublicationManager;

use APM\EntitySystem\Schema\Entity;
use APM\System\ApmImageType;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\LanguageManager;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TranscriptionManager;
use APM\System\Transcription\TxText\ChunkMark;
use APM\System\Transcription\TxText\Item;
use InvalidArgumentException;
use Predis\Client;
use RuntimeException;
use ThomasInstitut\ApmPublicationApi\PublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionColumn;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;
use ThomasInstitut\ApmPublicationApi\TranscriptionPage;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;
use ThomasInstitut\TimeString\TimeString;

class ApmPublicationManager implements PublicationManagerInterface
{

    private const string valkeyPrefix = 'APM:PublicationManager:';
    public function __construct(private readonly DocumentManager      $dm,
                                private readonly TranscriptionManager $tm,
                                private readonly LanguageManager      $lm,
                                private readonly array                $imageSources,
                                private readonly Client               $valkeyClient
    )
    {

    }

    public function list(): array
    {
        $ids = $this->valkeyClient->smembers(self::valkeyPrefix . 'pubs');
        $listings = [];
        foreach ($ids as $id) {
            $data = $this->valkeyClient->get(self::valkeyPrefix . 'pub:' . $id);
            if ($data) {
                /** @var PublicationData $pubData */
                $pubData = unserialize($data);
                $listing = new PublicationListing();
                $listing->id = $pubData->id;
                $listing->type = $pubData->type;
                $listing->title = $pubData->title;
                $listing->versionTimeString = $pubData->versionTimeString;
                $listing->description = $pubData->description ?? '';
                $listings[] = $listing;
            }
        }
        return $listings;
    }

    public function getPublication(int $id): PublicationData
    {
        $data = $this->valkeyClient->get(self::valkeyPrefix . 'pub:' . $id);
        if (!$data) {
            throw new PublicationNotFoundException("Publication with ID $id not found");
        }
        return unserialize($data);
    }

    public function updatePublication(int $id, string $version = 'current'): void
    {
        $pubKey = self::valkeyPrefix . 'pub:' . $id;
        $existingDataStr = $this->valkeyClient->get($pubKey);
        if (!$existingDataStr) {
            throw new PublicationNotFoundException("Publication with ID $id not found");
        }
        /** @var PublicationData $existingData */
        $existingData = unserialize($existingDataStr);
        $type = $existingData->type;

        if ($type === PublicationType::Transcription) {
            try {
                $data = $this->getTranscriptionDataForDocument($id, $version);
                $this->valkeyClient->set($pubKey, serialize($data));
            } catch (DocumentNotFoundException|PageNotFoundException $e) {
                throw new ResourceNotFoundException("Resource not found: " . $e->getMessage(), 0, $e);
            } catch (InvalidTimeStringException $e) {
                throw new RuntimeException("Invalid time string: " . $e->getMessage(), 0, $e);
            }
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

    public function createPublication(string $type, int $resourceId, string $version = 'current', bool $dryRun = false): PublicationData
    {
        if ($type === PublicationType::Transcription) {
            try {
                $data = $this->getTranscriptionDataForDocument($resourceId, $version);
                if ($dryRun) {
                    return $data;
                }
                $id = $data->id;
                $this->valkeyClient->transaction(function ($tx) use ($id, $data) {
                    $tx->set(self::valkeyPrefix . 'pub:' . $id, serialize($data));
                    $tx->sadd(self::valkeyPrefix . 'pubs', [$id]);
                });

                return $data;
            } catch (DocumentNotFoundException|PageNotFoundException $e) {
                throw new ResourceNotFoundException("Resource not found: " . $e->getMessage(), 0, $e);
            } catch (InvalidTimeStringException $e) {
                throw new RuntimeException("Invalid time string: " . $e->getMessage(), 0, $e);
            }

        }
        throw new InvalidArgumentException("Publication type '$type' is not supported");
    }

    /**
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     * @throws InvalidTimeStringException
     */
    private  function getTranscriptionDataForDocument(int $docId, string $version = 'current'): TranscriptionData
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
        $data->versionTimeString = $version;
        $data->description = '';

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
                    if ($item->type === Item::CHUNK_MARK) {
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
                    } else {
                        $text .= $item->theText;
                    }
                }
            }
        }
        return trim($text);
    }

}