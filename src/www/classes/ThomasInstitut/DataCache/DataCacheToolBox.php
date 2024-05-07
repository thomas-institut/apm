<?php

namespace ThomasInstitut\DataCache;

class DataCacheToolBox
{


    /**
     * @param mixed $var
     * @param bool $compressed
     * @return string
     */
    static public function toStringToCache(mixed $var, bool $compressed = false) : string {
        $stringToCache = serialize($var);
        if ($compressed) {
            $compressedString = gzencode($stringToCache);
            if ($compressedString === false) {
                throw new \RuntimeException("Could not compress serialized string");
            }
            return base64_encode($compressedString);
        }
        return $stringToCache;
    }

    static public function fromCachedString(string $cachedString, bool $compressed = false) : mixed {
        if ($compressed) {
            $decodedString = base64_decode($cachedString);
            if ($decodedString === false) {
                throw new \RuntimeException("Could not decode cached string");
            }
            $uncompressedString = gzdecode($decodedString);
            if ($uncompressedString === false) {
                throw new \RuntimeException("Could not decompress cached string");
            }
            return unserialize($uncompressedString);
        } else {
            return unserialize($cachedString);
        }
    }
}