<?php

namespace ThomasInstitut\DataCache;

use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use RuntimeException;

/**
 * A DataCache that uses multiple data caches to store items.
 *
 * The intended purpose is to have a cache that first looks into a memory cache
 * and, if the item is not found, looks into a datatable cache
 */
class MultiCacheDataCache implements DataCache, LoggerAwareInterface
{
    use LoggerAwareTrait;
    /**
     * @var DataCache[]
     */
    private array $caches;

    /**
     * @var string[]
     */
    private array $prefixes;
    private bool $strict;


    /**
     *
     * @param DataCache[]|callable[] $caches DataCaches object or callables that generate a DataCache object
     * @param string[] $cachePrefixes  Prefixes to attach to the key for each cache
     * @param bool $strict  If true (default), throws an exception if a data cache cannot be constructed otherwise
     *    just continues with a null cache in its place
     */
    public function __construct(array $caches, array $cachePrefixes = [], bool $strict = true)
    {
        foreach($caches as $i => $dataCache) {
            if (is_callable($dataCache) || is_a($dataCache, DataCache::class)) {
                if (!isset($cachePrefixes[$i])) {
                    $cachePrefixes[$i] = '';
                }
                $this->caches[] = $dataCache;
                $this->prefixes[] = $cachePrefixes[$i];
            } else {
                throw new InvalidArgumentException("Element $i in input array neither a DataCache nor a callable");
            }
        }
        $this->strict = $strict;
        $this->logger = new NullLogger();
    }

    private function getDataCache(int $index) : DataCache {
        if (is_callable($this->caches[$index])) {
            $this->caches[$index] = call_user_func($this->caches[$index]);
            if (!is_a($this->caches[$index], DataCache::class)) {
                $this->caches[$index]= new NullDataCache();
                if ($this->strict) {
                    throw new RuntimeException("Callable for data cache $index did not return a DataCache: " . get_class($this->caches[$index]));
                }
            }
        }
        return $this->caches[$index];
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): string
    {
        $cachesWithoutData = [];
        foreach(array_keys($this->caches) as $i) {
            $dataCache = $this->getDataCache($i);
            try {
                $data = $dataCache->get($this->prefixes[$i] . $key);
                if (count($cachesWithoutData) > 0) {
                    $remainingTtl = $dataCache->getRemainingTtl($key);
                    if ($remainingTtl >= 0) {
                        $this->logger->debug("Reestablishing cache for '$key' with ttl $remainingTtl in caches ["
                            . implode(", ", $cachesWithoutData) . "]");
                        foreach ($cachesWithoutData as $cacheIndex) {
                            $this->getDataCache($cacheIndex)->set($this->prefixes[$cacheIndex] . $key, $data, $remainingTtl);
                        }
                    }
                }
                return $data;
            } catch (KeyNotInCacheException) {
                $cachesWithoutData[] = $i;
            }
        }
        throw new KeyNotInCacheException("Key '$key' not in multi-cache");
    }

    /**
     * @inheritDoc
     */
    public function isInCache(string $key): bool
    {
        try {
            return is_string($this->get($key));
        } catch (KeyNotInCacheException) {
            return false;
        }
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value, int $ttl = 0): void
    {
        foreach ($this->caches as $i => $dataCache) {
            $dataCache->set($this->prefixes[$i] . $key, $value, $ttl);
        }
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        foreach($this->caches as $i => $dataCache) {
            $dataCache->delete($this->prefixes[$i] . $key);
        }
    }

    /**
     * @inheritDoc
     */
    public function clear(): void
    {
        foreach($this->caches as $dataCache) {
            $dataCache->clear();
        }
    }

    /**
     * @inheritDoc
     */
    public function clean(): void
    {
        foreach($this->caches as $dataCache) {
            $dataCache->clean();
        }
    }

    /**
     * @inheritDoc
     */
    public function getRemainingTtl(string $key): int
    {
        return -1;
    }
}