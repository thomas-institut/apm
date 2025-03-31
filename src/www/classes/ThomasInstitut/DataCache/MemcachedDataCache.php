<?php

namespace ThomasInstitut\DataCache;

use Memcached;

class MemcachedDataCache implements DataCache
{

    const int defaultPort = 11211;
    const string defaultHost = '127.0.0.1';
    const int defaultWeight = 0;
    private Memcached $memCached;
    private int $defaultTtl;

    public function __construct(string $connectionId = null, array $servers = [])
    {

        $this->memCached = new Memcached($connectionId);
        $this->defaultTtl = 0;

        if (count($this->memCached->getServerList()) === 0) {
            if (count($servers) === 0) {
                $this->memCached->addServer(self::defaultHost, self::defaultPort, self::defaultWeight);
            } else {
                $this->memCached->addServers($servers);
            }
        }
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): string
    {
        $val = $this->memCached->get($key);
        if ($val === false) {
            throw new KeyNotInCacheException();
        }
        return $val;
    }

    /**
     * @inheritDoc
     */
    public function isInCache(string $key): bool
    {
        try {
            $this->get($key);
            return true;
        } catch (KeyNotInCacheException) {
            return false;
        }
    }

    public function setDefaultTtl(int $ttl): void
    {
        $this->defaultTtl = max(0, $ttl);
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value, int $ttl = -1): void
    {
        if ($ttl < 0) {
            $ttl = $this->defaultTtl;
        }
        $this->memCached->set($key, $value, $ttl);
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        $this->memCached->delete($key);
    }

    /**
     * @inheritDoc
     */
    public function flush(): void
    {
        $this->memCached->flush();
    }

    /**
     * @inheritDoc
     */
    public function clean(): void
    {
       // not supported by MemCached
    }

    /**
     * @inheritDoc
     */
    public function getRemainingTtl(string $key): int
    {
        return -1;
    }
}