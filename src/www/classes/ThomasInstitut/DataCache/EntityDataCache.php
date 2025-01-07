<?php

namespace ThomasInstitut\DataCache;

use ThomasInstitut\EntitySystem\EntityData;

interface EntityDataCache
{

    /**
     * Returns the data for an entity that is stored in the cache
     *
     * @param int $entityId
     * @return EntityData
     * @throws EntityNotInCacheException
     */
    public function getEntityData(int $entityId) : EntityData;

    /**
     * Store an entity data object in the cache overwriting previous data if applicable.
     *
     * @param EntityData $data
     * @param int $ttl
     * @return void
     */
    public function storeEntityData(EntityData $data, int $ttl = -1) : void;

    /**
     * Looks into the entity data stored in the cache for the given entity
     * and returns the object or objects for the statement or statements in which
     * the entity is the subject and which have the given predicate.
     *
     * For example, getObject(123456, Entity::pEntityName) returns a string with the
     * name of entity 123456 if there's data for that entity in the cache.
     *
     * If there's no data for the entity in the cache, throws an EntityNotInCacheException
     *
     * If there are no statements with the given predicate, returns null.
     *
     * If there's only one such statement or if there are many but $forceSingle is
     * true, the object of the first statement is returned.
     * If $forceSingle is false and there is more than one statement, returns an array with
     * the objects of the statements.
     *
     * @param int $entityId
     * @param int $predicate
     * @param bool $forceSingle
     * @return int|string|array|null
     * @throws EntityNotInCacheException
     */
    public function getObject(int $entityId, int $predicate, bool $forceSingle = true) : int|string|null|array;

}