<?php

namespace APM\System\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class GeneralConfig implements SettableFromArray
{
    use FromFlatArrayTrait;

    public string $appName = 'APM';
    public string $subDir = '';
    public string $defaultTimezone = 'UTC';
    public bool $devMode = false;
    public string $dbTablePrefix = 'ap_';
    public string $daemonPidFile = '/tmp/apm-daemon.pid';

}