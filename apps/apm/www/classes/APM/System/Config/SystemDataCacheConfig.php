<?php

namespace APM\System\Config;

final readonly class SystemDataCacheConfig
{
    public function __construct(
        public string $cachePrefix = 'APM:Sys:',
        public int $defaultTtl = 3600 * 24 * 30
    )
    {

    }

}