<?php

namespace APM\System\Config;

final readonly class CachesConfig
{
    public function __construct(
        public SystemDataCacheConfig $system = new SystemDataCacheConfig(),
        public MemDataCacheConfig $mem = new MemDataCacheConfig(),
        public DirDataCacheConfig $dir = new DirDataCacheConfig()
    )
    {
    }
}