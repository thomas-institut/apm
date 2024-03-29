<?php

namespace APM\System\Person;

use ThomasInstitut\EntitySystem\EntityData;

/**
 * Common person data methods.
 *
 * A person is an entity in the underlying Apm EntitySystem.
 *
 * This interface  is meant to provide also basic person data for general display in the APM website,
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
     * @param int $creatorTid
     * @return int
     * @throws InvalidPersonNameException
     */
    public function createPerson(string $name, string $sortName, int $creatorTid = -1) : int;


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


    /**
     * Returns the EntityData for the given person
     * @param int $tid
     * @return EntityData
     * @throws PersonNotFoundException
     */
    public function getPersonEntityData(int $tid) : EntityData;

    /**
     * Returns an array with entity data for every person defined in the system
     * (excluding merged people)
     * @return EntityData[]
     */
    public function getAllPeopleEntityData() : array;


}