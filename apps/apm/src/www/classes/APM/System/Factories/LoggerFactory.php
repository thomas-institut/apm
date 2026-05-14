<?php

namespace APM\System\Factories;

use Monolog\Handler\ErrorLogHandler;
use Monolog\Logger;

class LoggerFactory
{

    public static function create(): Logger
    {
        $logger = new Logger('APM');
        $logger->pushHandler(new ErrorLogHandler());
        return $logger;
    }
}