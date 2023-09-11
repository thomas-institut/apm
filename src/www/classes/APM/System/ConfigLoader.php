<?php

namespace APM\System;

global $standardFilePaths;

$standardFilePaths = [
    'config.php',
    '~/ti-apm/config.php',
    '/etc/ti-apm/config.php'
];

class ConfigLoader
{

    static public function loadConfig($altFilePaths = [], $onlyAltFilePaths = false) : bool {
        global $standardFilePaths;
        $configFilePaths = [];
        if (!$onlyAltFilePaths) {
            foreach ($standardFilePaths as $path) {
                $configFilePaths[] = $path;
            }
        }
        foreach ($altFilePaths as $path) {
            $configFilePaths[] = $path;
        }

        $configLoaded = false;
        $configLoadedFilePath = '';
        foreach ($configFilePaths as $filePath) {
            if (!$configLoaded && file_exists($filePath)) {
                $configLoaded = (@include_once $filePath);
                $configLoadedFilePath = $filePath;
            }
        }

        if (!$configLoaded) {
            return false;
        }

        global $config;
        $config[ApmConfigParameter::CONFIG_FILE_PATH] = $configLoadedFilePath;
        return true;
    }
}