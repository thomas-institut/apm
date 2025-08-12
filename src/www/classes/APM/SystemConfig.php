<?php

namespace APM;

use APM\System\ConfigLoader;
use APM\ToolBox\BaseUrlDetector;
use ThomasInstitut\TimeString\TimeString;

class SystemConfig
{

    const string APP_SETTINGS_FILE = 'app-settings.json';
    /**
     * Gets the system configuration array from configuration files
     *
     * If the configuration could not be loaded, returns a string with an error message.
     *
     * @return array|string
     */
    static public function get(): array|string
    {
        $rootPath = __DIR__ . '/../..';
        $config = ConfigLoader::getConfig(["$rootPath/version.yaml", "$rootPath/defaults.yaml"],
            ["$rootPath/config.yaml", '/etc/ti/apm.config.yaml']);
        if ($config === null) {
            return ConfigLoader::getErrorMessage();
        }
        $config['baseFullPath'] = $rootPath;

        if (!file_exists(self::APP_SETTINGS_FILE)) {
            $appSettings = self::genAppSettings($config);
            file_put_contents(self::APP_SETTINGS_FILE, json_encode($appSettings, JSON_PRETTY_PRINT));
        }

        return $config;
    }


    static private function genAppSettings(array $config): array
    {
        $now = TimeString::now();
        return [
            '_info' => "Auto generated $now, do not edit.",
            'baseUrl' => BaseUrlDetector::detectBaseUrl($config['subDir']),
            'devMode' => $config['devMode'],
            'showLanguageSelector' => $config['siteShowLanguageSelector'],
            'copyrightNotice' => $config['copyrightNotice'],
            'appName' => $config['appName'],
            'appVersion' => $config['version'],
            'versionDate' => $config['versionDate'],
            'versionExtra' => $config['versionExtra'],
            'cacheDataId' => $config['jsAppCacheDataId']
        ];
    }
}