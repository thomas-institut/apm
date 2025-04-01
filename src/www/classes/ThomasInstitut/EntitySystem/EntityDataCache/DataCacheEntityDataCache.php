<?php

namespace ThomasInstitut\EntitySystem\EntityDataCache;

use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\EntitySystem\EntityData;

class DataCacheEntityDataCache implements EntityDataCache
{

    use LoggerAwareTrait;


    protected DataCache $dataCache;
    protected string $keyPrefix;

    public function __construct(DataCache $dataCache, string $cacheKeyPrefix = '')
    {
        $this->dataCache = $dataCache;
        $this->keyPrefix = $cacheKeyPrefix;
    }

    protected function getCacheKey(int $tid) : string {
        return  $this->keyPrefix . $tid;
    }

    /**
     * @inheritDoc
     */
    public function getData(int $tid, string $dataId): EntityData
    {
        try {
            $rawData = $this->dataCache->get($this->getCacheKey($tid));
            $data = unserialize($rawData);
            if ($data['dataId'] !== $dataId) {
                throw new EntityNotInCacheException();
            }
            return $data['entityData'];
        } catch (KeyNotInCacheException) {
            throw new EntityNotInCacheException();
        }
    }

    /**
     * @inheritDoc
     */
    public function setData(int $tid, EntityData $entityData, string $dataId, int $ttl = -1): void
    {
        $this->dataCache->set($this->getCacheKey($tid),
            serialize([ 'dataId' => $dataId, 'entityData' => $entityData]), $ttl);
    }

    /**
     * @inheritDoc
     */
    public function invalidateData(int $tid): void
    {
        $this->dataCache->delete($this->getCacheKey($tid));
    }

    /**
     * @inheritDoc
     */
    public function clean(?string $dataId): void
    {
        $this->dataCache->clean();
    }

    /**
     * @inheritDoc
     */
    public function clear(): void
    {
       $this->dataCache->flush();
    }


}