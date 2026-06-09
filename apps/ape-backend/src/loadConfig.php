<?php

use CuyZ\Valinor\Mapper\MappingError;
use CuyZ\Valinor\MapperBuilder;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\ConfigLoader\ConfigLoader;

require_once __DIR__ . '/../vendor/autoload.php';

/**
 * @throws MappingError
 */
function loadConfig(): SystemConfig
{
    $baseDir = __DIR__ . '/..';
    $configArray = ConfigLoader::getConfigArray(
        [$baseDir . '/version.yaml'],
        [$baseDir . '/config.yaml', '/etc/ti/ape-config.yaml']
    );

    if ($configArray === null) {
        throw new \RuntimeException('Could not load config');
    }

    $configArray['general'] = $configArray;

    return (new MapperBuilder())
        ->allowSuperfluousKeys()
        ->mapper()
        ->map(SystemConfig::class, $configArray);
}
