<?php

namespace APM\System\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class GeneralConfig implements SettableFromArray
{
    use FromFlatArrayTrait;

    public string $baseFullPath;
}