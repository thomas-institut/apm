<?php

namespace APM\System\Config;

class GeneralConfig
{
    public string $appName = 'APM';
    public string $subDir = '';
    public string $defaultTimezone = 'UTC';
    public bool $devMode = false;
    public string $dbTablePrefix = 'ap_';
    public string $daemonPidFile = '/tmp/apm-daemon.pid';

}