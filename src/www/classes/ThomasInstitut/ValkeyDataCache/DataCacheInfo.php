<?php

namespace ThomasInstitut\ValkeyDataCache;

class DataCacheInfo
{
    /**
     * @var int Number of cached items, -1 if unknown
     */
    public int $itemCount = -1;
    /**
     * @var int Memory usage in bytes, -1 if unknown
     */
    public int $memoryUsage = -1;

}