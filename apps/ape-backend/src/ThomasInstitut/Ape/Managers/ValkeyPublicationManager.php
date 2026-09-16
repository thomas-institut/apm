<?php

namespace ThomasInstitut\Ape\Managers;

use Exception;
use Predis\ClientInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ApmPublicationApi\Client\PublicationApiClient;
use ThomasInstitut\ApmPublicationApi\PublicationData;

class ValkeyPublicationManager implements PublicationManager
{
    private const string KEY_LISTINGS = 'publications:listings';
    private const string KEY_DATA_PREFIX = 'publication:data:';
    private const string KEY_LAST_UPDATE = 'publications:lastUpdate';

    public function __construct(
        private readonly ClientInterface      $valkeyClient,
        private readonly PublicationApiClient $publicationApiClient,
        private readonly LoggerInterface      $logger
    ) {
    }

    public function getPublicationListings(): array
    {
        $data = $this->valkeyClient->get(self::KEY_LISTINGS);
        if (!$data) {
            return [];
        }

        return unserialize($data);
    }

    public function getPublicationData(int $publicationId): PublicationData
    {
        $data = $this->valkeyClient->get(self::KEY_DATA_PREFIX . $publicationId);
        if (!$data) {
            throw new PublicationNotFoundException("Publication with ID $publicationId not found in Valkey.");
        }

        return unserialize($data);
    }

    public function getLastUpdateTimestamp(): int
    {
        return (int)$this->valkeyClient->get(self::KEY_LAST_UPDATE);
    }

    public function updateFromApm(): void
    {
        $this->logger->info("Updating publications from APM");
        try {
            $apiResponse = $this->publicationApiClient->list();
            $apmListings = $apiResponse->publications;

            $this->logger->info("APM reports " . count($apmListings) . " publications");

            $localListings = $this->getPublicationListings();
            $localListingsById = [];
            foreach ($localListings as $listing) {
                $localListingsById[$listing->id] = $listing;
            }

            $newListings = [];
            $apmIds = [];

            foreach ($apmListings as $apmListing) {
                $id = $apmListing->id;
                $apmIds[] = $id;
                $localListing = $localListingsById[$id] ?? null;

                $needsDataUpdate = false;
                $needsListingUpdate = false;

                if (!$localListing || $localListing->versionTimeString !== $apmListing->versionTimeString) {
                    $needsDataUpdate = true;
                    $needsListingUpdate = true;
                } elseif ($localListing->title !== $apmListing->title || $localListing->description !== $apmListing->description) {
                    $needsListingUpdate = true;
                }

                if ($needsDataUpdate) {
                    if ($localListing === null) {
                        $this->logger->info("Publication $id is new, retrieving data from APM...");
                    } else {
                        $this->logger->info("Data for publication $id needs to be updated, retrieving from APM...");
                    }
                    try {
                        $dataResponse = $this->publicationApiClient->get($id);
                        $this->valkeyClient->set(self::KEY_DATA_PREFIX . $id, serialize($dataResponse->publicationData));
                        $this->logger->info("Data for publication $id saved");
                    } catch (Exception $e) {
                        $this->logger->error("Error fetching data for publication $id: " . $e->getMessage());
                        throw new ApmCommunicationProblemException("Error fetching data for publication $id", 0, $e);
                    }
                }

                if ($needsListingUpdate || $needsDataUpdate) {
                    $this->logger->info("Listing for publication $id updated");
                    $newListings[] = $apmListing;
                } else {
                    $newListings[] = $localListing;
                }
            }

            // Remove publications no longer in APM
            $localIds = array_keys($localListingsById);
            $idsToRemove = array_diff($localIds, $apmIds);
            foreach ($idsToRemove as $idToRemove) {
                $this->valkeyClient->del([self::KEY_DATA_PREFIX . $idToRemove]);
                $this->logger->info("Publication $idToRemove has been deleted since it is no longer in APM");
            }

            $this->valkeyClient->set(self::KEY_LISTINGS, serialize($newListings));
            $this->valkeyClient->set(self::KEY_LAST_UPDATE, time());

        } catch (Exception $e) {
            if (!($e instanceof ApmCommunicationProblemException)) {
                $this->logger->error("Error updating from APM: " . $e->getMessage());
                throw new ApmCommunicationProblemException("Error updating from APM", 0, $e);
            }
            throw $e;
        }
    }
}