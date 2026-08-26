<?php

namespace APM\System\Config;

final readonly class NodeServiceConfig
{
    public function __construct(public string $url,
                                public int    $httpTimeout = 45)
    {
    }

}