<?php

namespace ThomasInstitut\Ape\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class LogConfig implements SettableFromArray
{
    use FromFlatArrayTrait;

    public string $name = 'APE';
    public string $path = '/var/ape-backend/logs/ape.log';

}