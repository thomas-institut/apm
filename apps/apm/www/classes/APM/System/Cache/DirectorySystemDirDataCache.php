<?php

namespace APM\System\Cache;

use APM\System\Config\ApmSystemConfig;
use ThomasInstitut\DataCache\DirectoryDataCache;

class DirectorySystemDirDataCache extends DirectoryDataCache implements SystemDirDataCache
{

    public function __construct(ApmSystemConfig $config)
    {
        parent::__construct($config->caches->dir->path, $config->caches->dir->name);
        $this->setDefaultTtl($config->caches->dir->defaultTtl);
    }
}