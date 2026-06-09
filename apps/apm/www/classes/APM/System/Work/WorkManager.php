<?php

namespace APM\System\Work;

use Psr\Log\LoggerAwareInterface;

interface WorkManager extends LoggerAwareInterface
{

    /**
     * Returns work data for the given dareId
     *
     * @param string $dareId
     * @return WorkData
     * @throws WorkNotFoundException
     */
    public function getWorkDataByDareId(string $dareId) : WorkData;

    /**
     * Returns work data for the given tid
     *
     * @param int $workTid
     * @return WorkData
     * @throws WorkNotFoundException
     */
    public function getWorkData(int $workTid) : WorkData;


    /**
     * Returns an array of work data objects for the given
     * author
     * @param int $authorTid
     * @return WorkData[]
     */
    public function getWorksByAuthor(int $authorTid) : array;


    /**
     * Returns an array of entity ids corresponding to all
     * the people in the system that are authors of a work
     *
     * @return int[]
     */
    public function getAuthors(): array;

    /**
     * Returns an array with the ids of all the works that are enabled in the system
     * @return int[]
     */
    public function getEnabledWorks() : array;

    /**
     * Creates a new work with the given title, author, dareId and enabled status
     *
     * The author must be an entity of type "tPerson".
     *
     * dareId must be a string composed of a number of uppercase letters followed by
     * one or more digits.
     *
     * Returns the entity id of the new work
     *
     * @param string $workTitle
     * @param string $shortTitle
     * @param int $workAuthor
     * @param string $dareId
     * @param bool $enabled
     * @param int $creator
     * @return int
     */
    public function createWork(string $workTitle, string $shortTitle, int $workAuthor, string $dareId, bool $enabled, int $creator) : int;


    /**
     * Sets the enabled status of a work
     *
     * @param int $workId
     * @param bool $enabled
     * @return void
     * @throws WorkNotFoundException
     */
    public function setWorkEnableStatus(int $workId, bool $enabled): void;

}