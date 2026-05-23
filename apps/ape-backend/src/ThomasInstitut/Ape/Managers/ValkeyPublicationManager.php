<?php

namespace ThomasInstitut\Ape\Managers;

use Predis\Client;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ApmPublicationApi\PublicationData;

class ValkeyPublicationManager implements PublicationManager
{

    public function __construct(private Client, private PublicationApiClient $publicationApiClient, private LoggerInterface $logger)

    public function getPublicationListings(): array
    {
        // TODO: Implement getPublicationListings() method.
    }

    public function getPublicationData(int $publicationId): PublicationData
    {
        // TODO: Implement getPublicationData() method.
    }

    public function updateFromApm(): void
    {
        // TODO: Implement updateFromApm() method.
    }
}