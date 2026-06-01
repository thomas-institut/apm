<?php

namespace APM\System\Config;

class ApmSystemConfig
{
    public GeneralConfig $general;
    public UrlConfig $url;
    public VersionConfig $version;
    public LogConfig $log;
    public NodeServiceConfig $nodeService;

    public function __construct(
        VersionConfig $version,
        GeneralConfig $general = new GeneralConfig(),
        UrlConfig $url = new UrlConfig(),
        LogConfig $log = new LogConfig(),
        NodeServiceConfig $nodeService = new NodeServiceConfig()
    ) {
        $this->version = $version;
        $this->general = $general;
        $this->url = $url;
        $this->log = $log;
        $this->nodeService = $nodeService;
    }
}