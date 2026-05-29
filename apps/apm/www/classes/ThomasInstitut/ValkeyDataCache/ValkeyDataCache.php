<?php

namespace ThomasInstitut\ValkeyDataCache;

use Predis\Client;
use Predis\Collection\Iterator\Keyspace;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\ItemNotInCacheException;

class ValkeyDataCache implements DataCache
{

    private Client $client;
    private mixed $defaultTtl;
    private string $prefix;

    /**
     * ValkeyDataCache constructor.
     *
     * @param string $prefix
     * @param Client|null $client
     */
    public function __construct(string $prefix = '', ?Client $client = null)
    {
        $this->client = $client ?? new Client();
        $this->defaultTtl = 0;
        $this->prefix = $prefix;

    }

    /**
     * Returns information about the cache.
     *
     * @return DataCacheInfo
     */
    public function getInfo(): DataCacheInfo {
        $info = new DataCacheInfo();
        $threshold = 10000;

        if ($this->prefix === '') {
            $info->itemCount = $this->client->dbsize();
            $redisInfo = $this->client->info('memory');
            if (isset($redisInfo['Memory']['used_memory'])) {
                $info->memoryUsage = (int)$redisInfo['Memory']['used_memory'];
            }
        } else {
            $count = 0;
            $memoryUsage = 0;
            foreach (new Keyspace($this->client, $this->prefix . '*') as $key) {
                $count++;
                if ($count <= $threshold) {
                    $memoryUsage += (int)$this->client->executeRaw(['MEMORY', 'USAGE', $key]);
                }
            }
            $info->itemCount = $count;

            if ($count <= $threshold) {
                $info->memoryUsage = $memoryUsage;
            } else {
                $redisInfo = $this->client->info('memory');
                if (isset($redisInfo['Memory']['used_memory'])) {
                    $info->memoryUsage = (int)$redisInfo['Memory']['used_memory'];
                }
            }
        }

        return $info;
    }

    /**
     * @param string $key
     * @return string
     */
    private function getRealKey(string $key): string {
        return $this->prefix . $key;
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): string
    {

        $val = $this->client->get($this->getRealKey($key));
        if ($val === null) {
            throw new ItemNotInCacheException();
        }
        return $val;
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
        return $this->client->exists($this->getRealKey($key)) === 1;
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value, int $ttl = -1): void
    {
        if ($ttl === -1) {
            $ttl = $this->defaultTtl;
        }
        if ($ttl === 0) {
            $this->client->set($this->getRealKey($key), $value);
        } else {
            $this->client->setex($this->getRealKey($key), $ttl, $value);
        }
    }

    /**
     * @inheritDoc
     */
    public function setDefaultTtl(int $ttl): void
    {
        $this->defaultTtl = max(0, $ttl);
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        $this->client->del($this->getRealKey($key));
    }

    /**
     * @inheritDoc
     */
    public function flush(): void
    {
        $keys = [];
        foreach (new Keyspace($this->client, $this->prefix . '*') as $key) {
            $keys[] = $key;
            if (count($keys) >= 1000) {
                $this->client->del($keys);
                $keys = [];
            }
        }

        if (!empty($keys)) {
            $this->client->del($keys);
        }
    }

    /**
     * @inheritDoc
     */
    public function clean(): void
    {
        // not necessary to do anything
    }
}