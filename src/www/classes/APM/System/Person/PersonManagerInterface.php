<?php

namespace APM\System\Person;

/**
 * Common person data methods
 *
 * Person creation and full data management will be handled eventually by the Entity System.
 * This interface is meant to provide basic person data for general display in the APM website,
 * for example, when listing works, transcribers, etc.
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
     * @param bool $isUser
     * @return int
     * @throws InvalidPersonNameException
     */
    public function newPerson(string $name, string $sortName, bool $isUser = false) : int;

}