<?php

namespace ThomasInstitut\DataCache;

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

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value, int $ttl = 0): void
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
    public function clear(): void
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
}