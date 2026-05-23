<?php

namespace ThomasInstitut\Ape\Managers;

use ThomasInstitut\ApmPublicationApi\PublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationListing;

interface PublicationManager
{

    /**
     * Returns all publications in the system
     * @return array<PublicationListing>
     */
    public function getPublicationListings() : array;

    /**
     * Return the publication data for a given publication id
     * @param int $publicationId
     * @return PublicationData
     * @throws PublicationNotFoundException
     */
    public function getPublicationData(int $publicationId): PublicationData;

    /**
     * Queries the APM for new publications and updates the system accordingly.
     * @return void
     * @throws ApmCommunicationProblemException
     */
    public function updateFromApm() : void;


    /**
     * Returns the last time the publications were updated.
     *
     * If the system has never been updated, this will return 0.
     *
     * @return int
     */
    public function getLastUpdateTimestamp() : int;

}