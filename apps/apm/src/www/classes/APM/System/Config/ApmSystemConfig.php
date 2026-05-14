<?php

namespace APM\System\Config;

use ThomasInstitut\Settable\SettableFromArray;

class ApmSystemConfig implements SettableFromArray
{
    public GeneralConfig $general;
    public UrlConfig $url;
    public VersionConfig $version;
    public LogConfig $log;

    public function fromArray(array $config): void
    {
        $this->general = new GeneralConfig();
        $this->general->fromArray($config);

        $this->url = new UrlConfig();
        $this->url->fromArray($config['url'] ?? []);

        $this->version = new VersionConfig();
        $this->version->fromArray($config['version'] ?? []);

        $this->log = new LogConfig();
        $this->log->fromArray($config['log'] ?? []);
    }
}