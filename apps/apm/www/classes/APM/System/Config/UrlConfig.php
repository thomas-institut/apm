<?php

namespace APM\System\Config;

final readonly class UrlConfig
{


    public function __construct(public string $collatexHttp = 'http://localhost:7369',
                                public string $dareApi = 'https://dare.uni-koeln.de/app/api/db/',
                                public string $bilderberg = 'https://bilderberg.uni-koeln.de',
                                public string $uniKoeln = 'https://www.uni-koeln.de/',
                                public string $localImageRepository = 'https://averroes.uni-koeln.de/localrep',
                                public string $thomasInstitut = 'https://www.thomasinstitut.uni-koeln.de/')
    {
    }
}