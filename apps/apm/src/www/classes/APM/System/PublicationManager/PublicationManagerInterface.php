<?php

namespace APM\System\PublicationManager;

use ThomasInstitut\ApmPublicationApi\PublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationListing;

interface PublicationManagerInterface
{

    /**
     * Returns a list of all currently available publications
     *
     * @return PublicationListing[]
     */
    public function list(): array;

    /**
     * Returns the data for the given publication
     * @param int $id
     * @return PublicationData
     * @throws PublicationNotFoundException
     */
    public function getPublication(int $id): PublicationData;

    /**
     * Updates the publication with the given id to the given version.
     *
     * If the version is 'current,' the publication is updated to the latest version. The actual
     * version can be found by getting the publication data
     *
     * @param int $id
     * @param string $version a Timestring or 'current'
     * @return void
     * @throws PublicationNotFoundException
     * @throws InvalidVersionException
     */
    public function updatePublication(int $id, string $version = 'current'): void;

    /**
     * @param int $id
     * @return void
     * @throws PublicationNotFoundException
     */
    public function deletePublication(int $id): void;

    /**
     * Creates a new publication of the given type for the given resource and version
     * @param string $type : 'transcription' | 'edition'
     * @param int $resourceId document or edition Id
     * @param string $version a Timestring or 'current'
     * @param bool $dryRun if true, the publication is not created, but the data is returned as if it was
     * @return PublicationData the publication for the given resource and version
     * @throws ResourceNotFoundException
     * @throws InvalidVersionException
     */
    public function createPublication(string $type, int $resourceId, string $version = 'current', bool $dryRun = false): PublicationData;


}