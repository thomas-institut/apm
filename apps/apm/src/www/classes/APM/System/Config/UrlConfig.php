<?php

namespace APM\System\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class UrlConfig implements SettableFromArray
{

    use FromFlatArrayTrait;

    public string $collatexHttp = 'http://localhost:7369';
    public string $dareApi = 'https://dare.uni-koeln.de/app/api/db/';
    public string $bilderberg = 'https://bilderberg.uni-koeln.de';
    public string $uniKoeln = 'https://www.uni-koeln.de/';
    public string $thomasInstitut = 'https://www.thomasinstitut.uni-koeln.de/';
}