<?php

namespace APM\System\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class LogConfig implements SettableFromArray
{
    use FromFlatArrayTrait;

    public string $appName = 'APM';
    public bool $includeDebugInfo = false;
    public string $fileName;
    public bool $inPhpErrorHandler = false;


}