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
        $settings->appVersion = $config['version']['version'];
        $settings->versionDate = $config['version']['versionDate'];
        $settings->versionExtra = $config['version']['versionExtra'];
        $settings->cacheDataId = $config['version']['jsAppCacheDataId'];
        return $settings;

    }
}