<?php

namespace APM\System\Config;

final readonly class NodeServiceConfig
{
    public function __construct(public string $url = 'http://localhost:4711',
                                public int    $httpTimeout = 45)
    {
    }

}