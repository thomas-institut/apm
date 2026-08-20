<?php

namespace APM\MultiChunkEdition;


/**
 * Saving and retrieving multi-chunk editions
 */
interface MultiChunkEditionManager
{

    /**
     * Gets a multi-chunk edition's data array from the database
     *
     * @param int $id
     * @param string $timeString
     * @return MceSystemData
     * @throws MultiChunkEditionDoesNotExist
     */
    public function getMultiChunkEditionById(int $id, string $timeString = '') : MceSystemData;


    /**
     * Saves a multi-chunk edition with the given data array
     * Returns the id of the saved edition
     *
     * @param int $id,  if === -1, creates a new edition
     * @param array<string, mixed> $mceData
     * @param int $authorId
     * @param string $versionDescription
     * @return int
     */
    public function saveMultiChunkEdition(int $id, array $mceData, int $authorId, string $versionDescription) : int;

    /**
     * Returns a list of all multi-chunk editions by the given user.
     *
     * The return array elements are associative arrays of the form:
     *
     *   [ 'id' => multiChunkEditionId,  'title' => editionTitle ]
     *
     * @param int $userId
     * @param bool $includeArchived
     * @return array<array{id: int, title: string}>
     */
    public function getMultiChunkEditionsByUser(int $userId, bool $includeArchived = false): array;

    /**
     * @param int $mceId
     * @return MceVersionInfo[]
     * @throws MultiChunkEditionDoesNotExist
     */
    public function getEditionVersions(int $mceId) : array;


}