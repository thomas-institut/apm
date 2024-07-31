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

}