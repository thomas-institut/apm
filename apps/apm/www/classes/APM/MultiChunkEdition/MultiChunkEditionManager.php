<?php

namespace APM\MultiChunkEdition;


/**
 * Saving and retrieving multi-chunk editions
 */
abstract class MultiChunkEditionManager
{

    /**
     * Gets a multi-chunk edition's data array from the database
     *
     * @param int $id
     * @param string $timeString
     * @return MceSystemData
     * @throws MultiChunkEditionDoesNotExist
     */
    abstract public function getMultiChunkEditionById(int $id, string $timeString = '') : MceSystemData;


    /**
     * Saves a multi-chunk edition with the given data array
     * Returns the id of the saved edition
     *
     * @param int $id,  if === -1, creates a new edition
     * @param array $mceData
     * @param int $authorId
     * @param string $versionDescription
     * @return int
     */
    abstract public function saveMultiChunkEdition(int $id, array $mceData, int $authorId, string $versionDescription) : int;


    /**
     * Gets a list of ids of multi-chunk editions that include the given work and chunk
     * @param string $workId
     * @param int $chunkId
     * @return array
     */
    abstract public function getMultiChunkEditionIdsByWorkChunk(string $workId, int $chunkId) : array;

    /**
     * Returns a list of all multi-chunk editions by the given user.
     *
     * The return array elements are associative arrays of the form:
     *
     *   [ 'id' => multiChunkEditionId,  'title' => editionTitle ]
     *
     * @param int $userTid
     * @return array
     */
    abstract public function getMultiChunkEditionsByUser(int $userTid): array;

    /**
     * @param int $mceId
     * @return MceVersionInfo[]
     * @throws MultiChunkEditionDoesNotExist
     */
    abstract public function getEditionVersions(int $mceId) : array;


}