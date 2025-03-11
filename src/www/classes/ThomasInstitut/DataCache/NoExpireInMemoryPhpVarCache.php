<?php

namespace ThomasInstitut\DataCache;

/**
 * The simplest PHPVarCache possible
 */
class NoExpireInMemoryPhpVarCache implements PhpVarCache
{

    private array $cache;

    public function __construct()
    {
        $this->cache = [];
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): mixed
    {
        if (isset($this->cache[$key])) {
            return $this->cache[$key];
        }
        throw new KeyNotInCacheException("$key not found in cache");
    }

    /**
     * @inheritDoc
     */
    public function getRemainingTtl(string $key): int
    {
       return -1;
    }

    /**
     * @inheritDoc
     */
    public function isInCache(string $key): bool
    {
        return isset($this->cache[$key]);
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, mixed $value, int $ttl = -1): void
    {
       $this->cache[$key] = $value;
    }

    /**
     * @inheritDoc
     */
    public function setDefaultTtl(int $ttl): void
    {
        // Nothing to do: TTL are meaningless in this cache
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        unset($this->cache[$key]);
    }

    /**
     * @inheritDoc
     */
    public function clear(): void
    {
        $this->cache = [];
    }

    /**
     * @inheritDoc
     */
    public function clean(): void
    {
        // Nothing to do: entries never expire in this cache
    }
}