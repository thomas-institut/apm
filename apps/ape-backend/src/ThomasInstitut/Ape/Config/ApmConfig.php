<?php

namespace ThomasInstitut\Ape\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class ApmConfig implements SettableFromArray
{
    use FromFlatArrayTrait;
    public string $apiUrl = 'http://localhost:9999/api';
    public string $token = '';
}