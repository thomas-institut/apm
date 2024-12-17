<?php

namespace APM\System;

use APM\EntitySystem\ApmEntitySystem;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\EntitySystem\EntityData;

class EntitySystemEditionSourceManager implements EditionSourceManager, LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * @var callable
     */
    private $entitySystemCallable;

    private ?ApmEntitySystemInterface $entitySystem;


    /**
     * @param callable $getEntitySystem
     */
    public function __construct(callable $getEntitySystem)
    {
        $this->entitySystemCallable = $getEntitySystem;
        $this->entitySystem = null;
    }

    public function getSourceByTid(int $tid): array
    {
        try {
            return $this->entityDataToSourceData($this->getEntitySystem()->getEntityData($tid));
        } catch (EntityDoesNotExistException) {
            throw  new InvalidArgumentException("Source $tid not found");
        }
    }

    public function getAllSources(): array
    {
        $allSourceEntities = $this->getEntitySystem()->getAllEntitiesForType(Entity::tGenericEditionSource);
        $allSources = [];
        foreach ($allSourceEntities as $entityId) {
            try {
                $allSources[] = $this->entityDataToSourceData($this->getEntitySystem()->getEntityData($entityId));
            } catch (EntityDoesNotExistException) {
                // Should NEVER happen
                throw new \RuntimeException("Source $entityId not found");
            }
        }
        return $allSources;
    }

    private function entityDataToSourceData(EntityData $entityData) : array {
        $sourceData = [
            'title' => $entityData->getObjectForPredicate(Entity::pEntityName) ?? '',
            'description' => $entityData->getObjectForPredicate(Entity::pEntityDescription) ?? '',
            'defaultSiglum' => $entityData->getObjectForPredicate(Entity::pDefaultSiglum) ?? '',
            'tid' => $entityData->id
        ];

        $specificSource = $entityData->getObjectForPredicate(Entity::pSpecificSource);
        if ($specificSource !== null) {
            $sourceData['specificSource'] = $specificSource;
        }
        return $sourceData;
    }

    private function getEntitySystem() : ApmEntitySystemInterface {
        if ($this->entitySystem === null) {
            $this->entitySystem =call_user_func($this->entitySystemCallable);
        }
        return $this->entitySystem;
    }

}