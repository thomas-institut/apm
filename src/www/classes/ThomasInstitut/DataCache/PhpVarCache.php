<?php

namespace ThomasInstitut\DataCache;

/**
 * Interface to a cache that can store any PHP variable,
 * e.g., object, strings, arrays, etc.
 */
interface PhpVarCache
{
    /**
     * Gets the value associated with the given key.
     * If the key is not the cache, throws a KeyNotInCacheException
     *
     * @param string $key
     * @return mixed
     * @throws KeyNotInCacheException
     */
    public function get(string $key) : mixed;


    /**
     * Returns the number of seconds until the item expires.
     * If the cache cannot determine this.
     * @param string $key
     * @return int
     * @throws KeyNotInCacheException
     */
    public function getRemainingTtl(string $key) : int;


    /**
     * Returns true if the given key is stored in the cache
     * @param string $key
     * @return bool
     */
    public function isInCache(string $key) : bool;

    /**
     * Sets the value for the given key with the given TTL
     * If $ttl === 0, the cache item never expires.
     * If $ttl < 0, the default ttl is used
     * @param string $key
     * @param mixed $value
     * @param int $ttl
     * @return void
     */
    public function set(string $key, mixed $value, int $ttl = -1) : void;


    /**
     * Sets the default ttl.
     *
     * @param int $ttl
     * @return void
     */
    public function setDefaultTtl(int $ttl) : void;

    /**
     * Deletes the cache entry for the given key
     * If the key is not the cache, does not do anything.
     * @param string $key
     */
    public function delete(string $key) : void;


    /**
     * Deletes all entries in the cache
     * @return void
     */
    public function clear() : void;


    /**
     * Deletes all expired entries
     * @return void
     */
    public function clean() : void;
}