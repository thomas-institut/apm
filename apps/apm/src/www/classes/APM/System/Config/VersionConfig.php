<?php

namespace APM\System\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class VersionConfig implements SettableFromArray
{
    use FromFlatArrayTrait;

    public string $version;
    public string $versionDate;
    public string $versionExtra = '';
    public string $jsAppCacheDataId;

}