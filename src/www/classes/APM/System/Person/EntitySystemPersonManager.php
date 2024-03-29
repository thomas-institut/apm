<?php

namespace APM\System\Person;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidEntityTypeException;
use APM\EntitySystem\Schema\Entity;
use APM\System\User\UserManagerInterface;
use APM\System\User\UserNotFoundException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use RuntimeException;
use ThomasInstitut\EntitySystem\EntityData;

class EntitySystemPersonManager implements PersonManagerInterface, LoggerAwareInterface
{

    use LoggerAwareTrait;

    private ApmEntitySystemInterface $es;
    private UserManagerInterface $um;

    public function __construct(ApmEntitySystemInterface $entitySystem, UserManagerInterface $userManager)
    {
        $this->es = $entitySystem;
        $this->um = $userManager;
        $this->logger = new NullLogger();
    }

    /**
     * @inheritDoc
     */
    public function getPersonEssentialData(int $personTid): PersonEssentialData
    {


        try {
            $personData = $this->es->getEntityData($personTid);
        } catch (EntityDoesNotExistException) {
            throw new PersonNotFoundException("Entity $personTid does not exist");
        }
        if ($personData->getObjectForPredicate(Entity::pEntityType) !== Entity::tPerson) {
            throw new PersonNotFoundException("Given tid $personTid is not a person");
        }
        if($personData->isMerged()) {
            try {
                $personData = $this->es->getEntityData($personData->mergedInto);
            } catch (EntityDoesNotExistException) {
                // should never happen
                throw new RuntimeException("Person $personTid is merged into entity $personData->mergedInto, but the latter does not exist");
            }
        }

        return $this->getEssentialDataFromEntityData($personData);
    }

    private function getEssentialDataFromEntityData(EntityData $entityData) : PersonEssentialData {
        $data = new PersonEssentialData();

        $data->tid = $entityData->id;
        $data->name = $entityData->getObjectForPredicate(Entity::pEntityName) ?? '';
        $data->sortName = $entityData->getObjectForPredicate(Entity::pSortName) ?? '';
        $data->userTags = [];
        $data->extraAttributes = [];

        $data->isUser = false;
        if ($this->um->isUser($data->tid)) {
            try {
                $userData = $this->um->getUserData($data->tid);
            } catch (UserNotFoundException) {
                // should never happen, but should not break things too much
                $this->logger->error("User data not found for tid $data->tid");
            }
            $data->isUser = true;
            $data->userName = $userData->userName ?? '';
            $data->userTags = $userData->tags ?? [];
            $data->userEmailAddress = $userData->emailAddress ?? '';
        }

        return $data;
    }

    /**
     * @param string $name
     * @param string $sortName
     * @param int $creatorTid
     * @inheritDoc
     */
    public function createPerson(string $name, string $sortName, int $creatorTid = -1): int
    {

        if ($creatorTid === -1) {
            $creatorTid = Entity::System;
        }

        try {
            $tid = $this->es->createEntity(Entity::tPerson, $name, '', $creatorTid);
            $this->es->makeStatement($tid, Entity::pSortName, $sortName, $creatorTid, 'Creating person');
        } catch (InvalidEntityTypeException) {
            // impossible!
            throw new RuntimeException("Invalid type, should never happen");
        }

        return $tid;
    }

    /**
     * @inheritDoc
     */
    public function getAllPeopleTids(): array
    {
        return $this->es->getAllEntitiesForType(Entity::tPerson);
    }

    /**
     * @inheritDoc
     */
    public function getAllPeopleEssentialData(): array
    {
        $dataArray = [];

        foreach($this->getAllPeopleTids() as $tid) {
            try {
                $dataArray[] = $this->getPersonEssentialData($tid);
            } catch (PersonNotFoundException) {
                // should never happen
                throw new RuntimeException("Person $tid reported in all people tids not found");
            }
        }
        return $dataArray;

    }

    /**
     * @inheritDoc
     */
    public function getPersonEntityData(int $tid): EntityData
    {
        try {
            $type = $this->es->getEntityType($tid);
            if ($type !== Entity::tPerson) {
                throw new PersonNotFoundException("Entity $tid not a person");
            }
            return $this->es->getEntityData($tid);
        } catch (EntityDoesNotExistException) {
            throw new PersonNotFoundException("Person $tid not found");
        }
    }

    /**
     * @inheritDoc
     */
    public function getAllPeopleEntityData(): array
    {
        $peopleTids = $this->es->getAllEntitiesForType(Entity::tPerson);
        $dataArray = [];
        foreach ($peopleTids as $tid) {
            try {
                $dataArray[] = $this->es->getEntityData($tid);
            } catch (EntityDoesNotExistException $e) {
                // should never happen
                throw new RuntimeException("Person $tid reported in all people tids not found");
            }
        }
        return $dataArray;
    }
}