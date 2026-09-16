<?php

namespace APM\System\Config;

final readonly class VersionConfig
{
    public function __construct(
        public string $version,
        public string $versionDate,
        public string $jsAppCacheDataId,
        public string $versionExtra = '',
    )
    {
    }
}