<?php

use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\ConfigLoader\ConfigLoader;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\WrongValueTypeException;

require_once __DIR__ . '/../vendor/autoload.php';

/**
 * @throws MissingRequiredValueException
 * @throws WrongValueTypeException
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
    $systemConfig = new SystemConfig();
    $systemConfig->fromArray($configArray);
    return $systemConfig;
}
