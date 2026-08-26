<?php

namespace APM\System\Config;

final readonly class DbConfig
{

    public function __construct(
        public string $db = 'apm',
        public string $host = 'localhost',
        public int    $port = 3306,
        public string $user = '',
        public string $pwd = '')
    {
    }
}