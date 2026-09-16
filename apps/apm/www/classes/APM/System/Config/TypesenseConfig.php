<?php

namespace APM\System\Config;

final readonly class TypesenseConfig
{

    public function __construct(
        public string $host = 'localhost',
        public int $port = 8108,
        public string $protocol = 'http',
        public string $key = 'no_key_set',
        public int $defaultPageSize = 10,
        public int $connectionTimeout = 2,
    )
    {
    }
}