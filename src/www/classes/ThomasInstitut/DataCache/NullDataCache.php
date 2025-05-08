<?php

namespace ThomasInstitut\DataCache;

/**
 * A DataCache that does not actually cache anything
 */
class NullDataCache implements DataCache
{

    /**
     * @inheritDoc
     */
    public function get(string $key): string
    {
        throw new KeyNotInCacheException();
    }

    /**
     * @inheritDoc
     */
    public function isInCache(string $key): bool
    {
        return false;
    }

    public function setDefaultTtl(int $ttl): void
    {

    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value, int $ttl = -1): void
    {
        // do nothing
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        // do nothing
    }

    /**
     * @inheritDoc
     */
    public function flush(): void
    {
        // do nothing
    }

    /**
     * @inheritDoc
     */
    public function clean(): void
    {
        // do nothing
    }

    /**
     * @inheritDoc
     */
    public function getRemainingTtl(string $key): int
    {
        return -1;
    }
}