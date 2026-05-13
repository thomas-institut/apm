<?php

namespace ThomasInstitut\Ape\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class GeneralConfig implements SettableFromArray
{
    use FromFlatArrayTrait;

    public string $name = 'APE Backend';
    public bool $devMode = true;
    public string $subDir = '';
}