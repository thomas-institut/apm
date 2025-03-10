<?php

namespace APM;

use APM\System\ConfigLoader;

class SystemConfig
{
    /**
     * Gets the system configuration array from configuration files
     *
     * If the configuration could not be loaded, returns a string with an error message.
     *
     * @return array|string
     */
    static public function get() : array|string {
        $rootPath = __DIR__ . '/../..';
        $config =  ConfigLoader::getConfig(["$rootPath/version.yaml" ,  "$rootPath/defaults.yaml"],
            [ "$rootPath/config.yaml", '/etc/ti/apm.config.yaml' ]);
        if ($config === null) {
            return ConfigLoader::getErrorMessage();
        }
        $config['baseFullPath'] = $rootPath;
        return $config;
    }

}