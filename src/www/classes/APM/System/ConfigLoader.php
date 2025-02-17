<?php

namespace APM\System;




use ThomasInstitut\ToolBox\ArrayUtils;
use ThomasInstitut\ToolBox\FileLoader;

class ConfigLoader {
    static private string $errorMessage = '';

    static public function getConfig(string $defaultConfigFile, array $configFilePaths) : array|null {
        $defaultConfigYaml = file_get_contents($defaultConfigFile);
        if ($defaultConfigYaml === false) {
            self::$errorMessage = 'Unable to open default config file';
            return null;
        }
        $defaultConfig = yaml_parse($defaultConfigYaml);
        if ($defaultConfig === false) {
            self::$errorMessage = 'Unable to parse the default config file';
            return null;
        }
        $configYaml = FileLoader::fileGetContents($configFilePaths);
        if ($configYaml === null) {
            self::$errorMessage = 'Config YAML file not found';
            return null;
        }
        $extraConfig = yaml_parse($configYaml);
        if ($extraConfig === false) {
            self::$errorMessage = 'Unable to parse config file';
            return null;
        }
        return ArrayUtils::getUpdatedArray($defaultConfig, $extraConfig);
    }

    static public function getErrorMessage() : string {
        return self::$errorMessage;
    }
}