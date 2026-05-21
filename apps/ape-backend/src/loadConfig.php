<?php

use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\ConfigLoader\ConfigLoader;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\WrongValueTypeException;

require_once __DIR__ . '/../vendor/autoload.php';

if (!function_exists('loadConfig')) {
    function loadConfig(): SystemConfig
    {
        $baseDir = __DIR__ . '/..';
        $configArray = ConfigLoader::getConfigArray(
            [$baseDir . '/version.yaml'],
            [$baseDir . '/config.yaml', '/etc/ti/ape-config.yaml']
        );

        if ($configArray === null) {
            exitWithErrorMessage(ConfigLoader::getErrorMessage());
        }

        $systemConfig = new SystemConfig();
        try {
            $systemConfig->fromArray($configArray);
        } catch (MissingRequiredValueException|WrongValueTypeException $e) {
            exitWithErrorMessage($e->getMessage());
        }

        return $systemConfig;
    }

}