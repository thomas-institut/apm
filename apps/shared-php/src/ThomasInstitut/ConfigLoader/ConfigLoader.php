<?php


namespace ThomasInstitut\ConfigLoader;
use InvalidArgumentException;

class ConfigLoader
{
    static private string $errorMessage = '';


    /**
     * Loads a configuration array out of a number of default configuration files
     * and a user configuration.
     *
     * Configuration files are YAML files.
     *
     * @param array $defaultConfigFiles List of required configuration files
     * @param array $configFilePaths List of paths for user configuration files, the first one found will be used
     * @return array|null
     */
    static public function getConfigArray(array $defaultConfigFiles, array $configFilePaths): array|null
    {

        $defaultConfig = [];
        foreach ($defaultConfigFiles as $defaultConfigFile) {
            $defaultConfigYaml = @file_get_contents($defaultConfigFile);
            if ($defaultConfigYaml === false) {
                self::$errorMessage = "Unable to open default config file '$defaultConfigFile'";
                return null;
            }
            $partialDefaultConfig = @yaml_parse($defaultConfigYaml);
            if ($partialDefaultConfig === false) {
                self::$errorMessage = "Unable to parse default config file '$defaultConfigFile'";
                return null;
            }
            $defaultConfig = self::getUpdatedArray($defaultConfig, $partialDefaultConfig);
        }


        $configYaml = self::fileGetContents($configFilePaths);
        if ($configYaml === null) {
            self::$errorMessage = 'Config YAML file not found';
            return null;
        }
        $extraConfig = @yaml_parse($configYaml);
        if ($extraConfig === null || $extraConfig === false) {
           $extraConfig = [];
        }
        return self::getUpdatedArray($defaultConfig, $extraConfig);
    }

    static public function getErrorMessage(): string
    {
        return self::$errorMessage;
    }

    /**
     * Returns a new associative array that is a deep copy of the given array
     * with fields updated with the contents of the given update array.
     *
     * For example, if the array to update is ``[ 'color' => 'green', 'size' => 12]``
     * and the update is ``[ 'color' => 'red']`` the output will be ``[ 'color' => 'red', 'size' => 12]``
     *
     * The method will process all fields in the input array recursively.
     *
     * @param array $array
     * @param array $update
     * @param string $parentKeyId
     * @return array
     */
    public static function getUpdatedArray(array $array, array $update, string $parentKeyId = ''): array
    {
        $outputArray = [];
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                if (isset($update[$key])) {
                    if (!is_array($update[$key])) {
                        throw new InvalidArgumentException("Trying to update array $parentKeyId:$key with non array");
                    }
                    $outputArray[$key] = self::getUpdatedArray($value, $update[$key], "$parentKeyId:$key");
                } else {
                    // get the update with an empty array so that we get a deep copy
                    $outputArray[$key] = self::getUpdatedArray($value, []);
                }
            } else {
                $outputArray[$key] = $update[$key] ?? $value;
            }
        }
        foreach ($update as $key => $value) {
            if (!isset($outputArray[$key])) {
                $outputArray[$key] = $value;
            }
        }
        return $outputArray;
    }

    /**
     * Goes over a list of file names and returns the contents of the first
     * one that exists, or null if no file was found
     *
     * @param array $fileNames
     * @return string|null
     */
    public static function fileGetContents(array $fileNames): string|null
    {
        for ($i = 0; $i < count($fileNames); $i++) {
            $filePath = $fileNames[$i];
            if (file_exists($filePath)) {
                $fileContents = @file_get_contents($filePath);
                if ($fileContents !== false) {
                    return $fileContents;
                }
            }
        }
        return null;
    }
}
