<?php

namespace APM\System\Person;

/**
 * Common person data methods
 *
 * Person creation and full data management will be handled eventually by the Entity System.
 *
 * This interface is meant to provide also basic person data for general display in the APM website,
 * for example, when listing works, transcribers, etc.
 *
 * Normally, implementations will make use of a UserManagerInterface class
 *
 */
interface PersonManagerInterface
{

    /**
     * Returns a person's essential data
     * @param int $personTid
     * @return PersonEssentialData
     * @throws PersonNotFoundException
     */
    public function getPersonEssentialData(int $personTid) : PersonEssentialData;

    /**
     * Creates a new person in the system and returns the new person's tid
     *
     * @param string $name
     * @param string $sortName
     * @return int
     * @throws InvalidPersonNameException
     */
    public function createPerson(string $name, string $sortName) : int;


    /**
     * Returns all the tids corresponding to Person entities in the system
     *
     * @return int[]
     */
    public function getAllPeopleTids() : array;


    /**
     * Returns an array with the essential data for all people in the system
     *
     * This can be a slow operation, so it's a good candidate to be cached upstream.
     *
     * @return PersonEssentialData[]
     */
    public function getAllPeopleEssentialData() : array;

}