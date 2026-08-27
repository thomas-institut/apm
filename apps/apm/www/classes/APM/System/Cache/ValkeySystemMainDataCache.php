<?php

namespace APM\System\Cache;

use APM\System\Config\ApmSystemConfig;
use Predis\Client;
use ThomasInstitut\ValkeyDataCache\ValkeyDataCache;

class ValkeySystemMainDataCache extends ValkeyDataCache implements SystemMainDataCache
{
    public function __construct(ApmSystemConfig $config, Client $client)
    {
        parent::__construct($config->caches->system->cachePrefix, $client);
        $this->setDefaultTtl($config->caches->system->defaultTtl);
    }
}