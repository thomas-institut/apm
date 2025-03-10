<?php

namespace APM\System;




use ThomasInstitut\ToolBox\ArrayUtils;
use ThomasInstitut\ToolBox\FileLoader;

class ConfigLoader {
    static private string $errorMessage = '';


    /**
     * Loads a configuration array out of a number of default configuration files
     * and a user configuration.
     *
     * @param array $defaultConfigFiles
     * @param array $configFilePaths
     * @return array|null
     */
    static public function getConfig(array $defaultConfigFiles, array $configFilePaths) : array|null {

        $defaultConfig = [];
        foreach ($defaultConfigFiles as $defaultConfigFile) {
            $defaultConfigYaml = file_get_contents($defaultConfigFile);
            if ($defaultConfigYaml === false) {
                self::$errorMessage = "Unable to open default config file '$defaultConfigFile'";
                return null;
            }
            $partialDefaultConfig = yaml_parse($defaultConfigYaml);
            if ($partialDefaultConfig === false) {
                self::$errorMessage = "Unable to parse default config file '$defaultConfigFile'";
                return null;
            }
            $defaultConfig = ArrayUtils::getUpdatedArray($defaultConfig, $partialDefaultConfig);
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