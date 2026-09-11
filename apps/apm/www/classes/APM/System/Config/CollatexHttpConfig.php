<?php

namespace APM\System\Config;

final readonly class CollatexHttpConfig
{
    public function __construct(
        public string $host = '127.0.0.1',
        public int    $port = 7369,
    )
    {
    }
}