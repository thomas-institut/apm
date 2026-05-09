<?php

namespace APM\Site;

use APM\ToolBox\BaseUrlDetector;
use ThomasInstitut\TimeString\TimeString;

final class AppSettings
{
    public string $info;
    public string $baseUrl;
    public bool $devMode;
    public bool $showLanguageSelector;
    public string $copyrightNotice;
    public string $appName;
    public string $appVersion;
    public string $versionDate;
    public string $versionExtra;
    public string $cacheDataId;


    static public function generateFromConfig(array $config): self
    {
        $now = TimeString::now();
        $settings = new AppSettings();
        $settings->info = "Auto generated $now";
        $settings->baseUrl = BaseUrlDetector::detectBaseUrl($config['subDir']);
        $settings->devMode = $config['devMode'];
        $settings->showLanguageSelector = $config['siteShowLanguageSelector'];
        $settings->copyrightNotice = $config['copyrightNotice'];
        $settings->appName = $config['appName'];
        $settings->appVersion = $config['version'];
        $settings->versionDate = $config['versionDate'];
        $settings->versionExtra = $config['versionExtra'];
        $settings->cacheDataId = $config['jsAppCacheDataId'];
        return $settings;

//        return [
//            '_info' => "Auto generated $now",
//            'baseUrl' => BaseUrlDetector::detectBaseUrl($config['subDir']),
//            'devMode' => $config['devMode'],
//            'showLanguageSelector' => $config['siteShowLanguageSelector'],
//            'copyrightNotice' => $config['copyrightNotice'],
//            'appName' => $config['appName'],
//            'appVersion' => $config['version'],
//            'versionDate' => $config['versionDate'],
//            'versionExtra' => $config['versionExtra'],
//            'cacheDataId' => $config['jsAppCacheDataId']
//        ];
    }
}