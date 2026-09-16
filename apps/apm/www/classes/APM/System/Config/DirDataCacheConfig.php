<?php

namespace APM\System\Config;

final readonly class DirDataCacheConfig
{
    public function __construct(
        public string $path = '/tmp',
        public string $name = 'apm',
        public int    $defaultTtl = 365 * 24 * 3600 // 1 year,
    )
    {
    }
}