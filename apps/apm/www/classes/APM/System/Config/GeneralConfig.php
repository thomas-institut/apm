<?php

namespace APM\System\Config;

final readonly class GeneralConfig
{


    public function __construct(public string $appName = 'APM',
                                public string $subDir = '',
                                public string $defaultTimezone = 'UTC',
                                public bool   $devMode = false,
                                public string $dbTablePrefix = 'ap_',
                                public string $copyrightNotice =
                                '2016-26, <a href="https://www.thomasinstitut.uni-koeln.de/">Thomas-Institut</a>, <a href="https://www.uni-koeln.de/"> Universität zu Köln </a>',
                                public string $daemonPidFile = '/tmp/apm-daemon.pid')
    {
    }

}