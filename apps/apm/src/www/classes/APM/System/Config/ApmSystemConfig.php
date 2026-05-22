<?php

namespace APM\System\Config;

class ApmSystemConfig
{
    public GeneralConfig $general;
    public UrlConfig $url;
    public VersionConfig $version;
    public LogConfig $log;

    public function __construct(
        VersionConfig $version,
        GeneralConfig $general = new GeneralConfig(),
        UrlConfig $url = new UrlConfig(),
        LogConfig $log = new LogConfig()
    ) {
        $this->version = $version;
        $this->general = $general;
        $this->url = $url;
        $this->log = $log;
    }
}