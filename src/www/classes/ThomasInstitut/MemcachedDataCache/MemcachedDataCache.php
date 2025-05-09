<?php

namespace ThomasInstitut\MemcachedDataCache;

use Memcached;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\ItemNotInCacheException;

class MemcachedDataCache implements DataCache
{

    const int defaultPort = 11211;
    const string defaultHost = '127.0.0.1';
    const int MaxPartSize = 1000000;
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

    private function getActualKey(string $key): string {
        if (strlen($key) > 250) {
            return hash('sha224', $key);
        }
        return $key;
    }

    private function getBigItemKey(string $key, int $part = -1): string {

        $theKey = "MemcachedDataCache_BigItem_" . $this->getActualKey($key);
        if ($part >= 0) {
            $theKey .= "_" . $part;
        }
        return hash('sha224', $theKey);
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): string
    {
        $numParts = $this->memCached->get($this->getBigItemKey($key));
        if ($numParts === false) {
            $val = $this->memCached->get($this->getActualKey($key));
            if ($val === false) {
                throw new ItemNotInCacheException();
            }
            return $val;
        }
        $bigItem = '';
        $numParts = intval($numParts);
        for ($i = 0; $i < $numParts; $i++) {
            $part = $this->memCached->get($this->getBigItemKey($key, $i));
            if ($part === false) {
                throw new ItemNotInCacheException();
            }
            $bigItem .= $part;
        }
        return $bigItem;
    }

    /**
     * @inheritDoc
     */
    public function isInCache(string $key): bool
    {
        try {
            $this->get($key);
            return true;
        } catch (ItemNotInCacheException) {
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

        if (strlen($value) > self::MaxPartSize) {
            $parts = [];
            $bigItemSize = strlen($value);
            for ($i = 0; $i < $bigItemSize; $i+=self::MaxPartSize) {
                $parts[] = substr($value, $i, self::MaxPartSize);
            }
            $numParts = count($parts);
            $this->memCached->set($this->getBigItemKey($key), $numParts);
            foreach ($parts as $index => $part) {
                $this->memCached->set($this->getBigItemKey($key, $index), $part);
            }
        } else {
            $this->memCached->set($this->getActualKey($key), $value, $ttl);
        }
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        $numParts = $this->memCached->get($this->getBigItemKey($key));
        if ($numParts === false) {
            $this->memCached->delete($this->getActualKey($key));
            return;
        }
        for ($i = 0; $i < $numParts; $i++) {
            $this->memCached->delete($this->getBigItemKey($key, $i));
        }
        $this->memCached->delete($this->getBigItemKey($key));
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