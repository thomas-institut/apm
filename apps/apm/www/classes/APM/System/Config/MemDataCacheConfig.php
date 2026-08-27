<?php

namespace APM\System\Config;

final readonly class MemDataCacheConfig
{
public function __construct(
    public string $cachePrefix = 'APM:Mem:',
    public int $defaultTtl = 3600 * 24
)
{
}
}