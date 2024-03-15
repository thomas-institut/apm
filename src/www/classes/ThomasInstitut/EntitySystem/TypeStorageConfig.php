<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\EntitySystem\EntityDataCache\EntityDataCache;

class TypeStorageConfig
{

    public int $type = -1;
    public StatementStorage $storage;
    public ?EntityDataCache $entityDataCache = null;
    public bool $useCache = false;
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

}