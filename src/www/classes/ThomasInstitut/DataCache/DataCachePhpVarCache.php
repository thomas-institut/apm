<?php

namespace ThomasInstitut\DataCache;

/**
 * A PhpVarCache that uses a normal DataCache for actual storage
 */
class DataCachePhpVarCache implements PhpVarCache
{


    private DataCache $dataCache;
    private bool $compressStorage;

    public function __construct(DataCache $dataCache, bool $compressStorage = false)
    {
        $this->dataCache = $dataCache;
        $this->compressStorage = $compressStorage;
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): mixed
    {
        return DataCacheToolBox::fromCachedString($this->dataCache->get($key), $this->compressStorage);
    }

    /**
     * @inheritDoc
     */
    public function getRemainingTtl(string $key): int
    {
        return $this->dataCache->getRemainingTtl($key);
    }

    /**
     * @inheritDoc
     */
    public function isInCache(string $key): bool
    {
       return $this->dataCache->isInCache($key);
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, mixed $value, int $ttl = -1): void
    {
        $this->dataCache->set($key, DataCacheToolBox::toStringToCache($value, $this->compressStorage), $ttl);
    }

    /**
     * @inheritDoc
     */
    public function setDefaultTtl(int $ttl): void
    {
        $this->dataCache->setDefaultTtl($ttl);
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        $this->dataCache->delete($key);
    }

    /**
     * @inheritDoc
     */
    public function clear(): void
    {
        $this->dataCache->clear();
    }

    /**
     * @inheritDoc
     */
    public function clean(): void
    {
        $this->dataCache->clean();
    }
}