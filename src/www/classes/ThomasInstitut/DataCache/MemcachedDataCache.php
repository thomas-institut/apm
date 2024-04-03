<?php

namespace ThomasInstitut\DataCache;

use Memcached;

class MemcachedDataCache implements DataCache
{

    const defaultPort = 11211;
    const defaultHost = '127.0.0.1';
    const defaultWeight = 0;
    private Memcached $memCached;

    public function __construct(string $connectionId = null, array $servers = [])
    {

        $this->memCached = new Memcached($connectionId);

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

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value, int $ttl = 0): void
    {
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
    public function clear(): void
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