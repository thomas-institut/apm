<?php

namespace ThomasInstitut\EntitySystem\EntityDataCache;

use Psr\Log\LoggerAwareInterface;
use ThomasInstitut\EntitySystem\EntityData;

/**
 * A cache for entity data
 */
interface EntityDataCache extends LoggerAwareInterface
{
    /**
     * Returns the data for the given entity.
     *
     * If no data has been set for the given entity, the stored data
     * has expired or the given $dataId does not match the last stored data's
     * dataId, throws a EntityNotInCache exception.
     *
     * @param int $tid
     * @param string $dataId
     * @return EntityData
     * @throws EntityNotInCacheException
     */
    public function getData(int $tid, string $dataId = '') : EntityData;

    /**
     * Sets the data for the given entity.
     *
     * If $ttl is larger than zero, the data will be invalid after $ttl seconds. If $ttl is less or equal than
     * zero, the data will never expire.
     *
     * A $dataId string can be passed to the method. Any subsequent call getData for the entity will throw a
     * EntityNotInCache exception if the $dataId for the getData call does not match the $dataId for the last
     * setData call.
     *
     * @param int $tid
     * @param EntityData $data
     * @param int $ttl
     * @param string $dataId
     * @return void
     */
    public function setData(int $tid, EntityData $data, int $ttl = -1, string $dataId = '') : void;

    /**
     * Invalidates the data for the given entity.
     *
     * After calling this method, any call to getData for the entity will result
     * in a EntityNotInCache exception being thrown.
     *
     * @param int $tid
     * @return void
     */
    public function invalidateData(int $tid): void;

    /**
     * Removes invalid data from the cache
     *
     * @return void
     */
    public function clean(): void;

    /**
     * Invalidates data for all entities in the cache
     * and calls the cache's clean method
     * @return void
     */
    public function flush(): void;

}