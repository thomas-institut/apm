<?php

namespace ThomasInstitut\DataCache;

class DataCacheToolBox
{

    static public function getStringToCache(array|object $object, bool $compressed = false) : string {

        $data = json_encode($object);
        if ($compressed) {
            $data = gzencode($data);
        }
        return base64_encode($data);
    }

    static public function getVarFromCachedString(string $cachedString, bool $compressed = false) : object|array {
        $cachedData = base64_decode($cachedString);
        if ($compressed) {
            $cachedData = gzdecode($cachedData);
        }
        return json_decode($cachedData, true);
    }
}