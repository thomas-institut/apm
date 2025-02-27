<?php

namespace ThomasInstitut\EntitySystem\EntityDataCache;

use APM\EntitySystem\Schema\Entity;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\PhpVarCache;
use ThomasInstitut\EntitySystem\EntityData;

/**
 * An EntityDataCache that uses a PhpVarCache for storage
 */
class PhpVarCacheSimpleEntityDataCache implements SimpleEntityDataCache
{


    private PhpVarCache $phpVarCache;

    public function __construct(PhpVarCache $phpVarCache)
    {
        $this->phpVarCache = $phpVarCache;
    }

    /**
     * @inheritDoc
     */
    public function getEntityData(int $entityId): EntityData
    {
        try {
            $dataPackage = $this->phpVarCache->get($entityId);
            return $dataPackage['entityData'];
        } catch (KeyNotInCacheException) {
            throw new EntityNotInCacheException("Entity $entityId not in cache");
        }
    }

    /**
     * @inheritDoc
     */
    public function storeEntityData(EntityData $data, int $ttl = -1): void
    {
        $this->phpVarCache->set($data->id, [ 'entityData' => $data ], $ttl);
    }

    /**
     * @inheritDoc
     */
    public function getObject(int $entityId, int $predicate, bool $forceSingle = true): int|string|null|array
    {
        try {
            $dataPackage = $this->phpVarCache->get($entityId);
            /** @var EntityData $entityData */
            $entityData = $dataPackage['entityData'];
            // first check for predicates already in entityData elements
            if ($predicate === Entity::pEntityName) {
                return $entityData->name;
            }
            if ($predicate === Entity::pEntityType) {
                return $entityData->type;
            }
            // now check for pre-calculated objects
            if (isset($dataPackage['objects'][$predicate])) {
                return $dataPackage['objects'][$predicate];
            }
            // no pre-calculated objects, so need to do all the work
            if (!isset($dataPackage['objects'])) {
                $dataPackage['objects'] = [];
            }
            $objectArray = $entityData->getAllObjectsForPredicate($predicate);
            if (count($objectArray) === 0) {
                $object = null;
            } else {
                if ($forceSingle) {
                    $object = $objectArray[0];
                } else {
                    $object = $objectArray;
                }
            }

            $dataPackage['objects'][$predicate] = $object;
            $remainingTtl = $this->phpVarCache->getRemainingTtl($entityId);
            $this->phpVarCache->set($entityId, $dataPackage, $remainingTtl);
            return $object;
        } catch (KeyNotInCacheException) {
            throw new EntityNotInCacheException("Entity $entityId not in cache");
        }
    }
}