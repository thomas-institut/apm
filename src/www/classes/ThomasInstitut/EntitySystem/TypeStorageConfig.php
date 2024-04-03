<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\EntitySystem\EntityDataCache\EntityDataCache;

class TypeStorageConfig
{

    public int $type = -1;
    public ?StatementStorage $storage = null;

    /**
     * @var callable
     */
    public $statementStorageCallable = null;
    public ?EntityDataCache $entityDataCache = null;

    /**
     * @var null|callable
     */
    public $entityDataCacheCallable = null;

    /**
     * If true, entity data will be cached in an EntityDataCache
     * @var bool
     */
    public bool $useCache = false;

    /**
     * If true, entity data will be cached in a memory DataCache, if available
     * @var bool
     */
    public bool $useMemCache = false;
    public ?int $ttl = null;

    public function withType(int $type) : TypeStorageConfig {
        $this->type = $type;
        return $this;
    }

    public function withStorage(StatementStorage $storage) : TypeStorageConfig {
        $this->storage = $storage;
        return $this;
    }

    public function withDataCache(EntityDataCache $entityDataCache) : TypeStorageConfig {
        $this->entityDataCache = $entityDataCache;
        $this->useCache = true;
        return $this;
    }

    public function withTtl(int $ttl) : TypeStorageConfig {
        $this->ttl = $ttl;
        return $this;
    }

    public function getEntityDataCache() : EntityDataCache|null {
        if (!$this->useCache) {
            return null;
        }
        if ($this->entityDataCache === null) {
            if ($this->entityDataCacheCallable === null) {
                return null;
            }
            $this->entityDataCache =  call_user_func($this->entityDataCacheCallable);
        }
        return $this->entityDataCache;
    }

    public function getStatementStorage() : StatementStorage|null {
        if ($this->storage === null) {
            if ($this->statementStorageCallable === null) {
                return null;
            }
            $this->storage = call_user_func($this->statementStorageCallable);
        }
        return $this->storage;
    }

}