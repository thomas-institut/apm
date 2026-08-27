<?php

namespace APM\System\Cache;

use APM\System\Config\ApmSystemConfig;
use Predis\Client;
use ThomasInstitut\ValkeyDataCache\ValkeyDataCache;

class ValkeySystemMemDataCache extends ValkeyDataCache implements SystemMemDataCache
{
    public function __construct(ApmSystemConfig $config, Client $client)
    {
        parent::__construct($config->caches->mem->cachePrefix, $client);
        $this->setDefaultTtl($config->caches->mem->defaultTtl);
    }
}