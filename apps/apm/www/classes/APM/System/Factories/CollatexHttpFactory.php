<?php

namespace APM\System\Factories;

use APM\CollationEngine\CollatexHttp;
use APM\System\Config\ApmSystemConfig;
use Psr\Log\LoggerInterface;

class CollatexHttpFactory
{
    public static function create(ApmSystemConfig $config, LoggerInterface $logger): CollatexHttp {
        $ch = new CollatexHttp($config->collatexHttp->host, $config->collatexHttp->port);
        $ch->setLogger($logger);
        return $ch;
    }
}