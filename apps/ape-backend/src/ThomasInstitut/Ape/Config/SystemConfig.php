<?php

namespace ThomasInstitut\Ape\Config;

class SystemConfig
{
    public LogConfig $log;
    public VersionConfig $version;
    public GeneralConfig $general;
    public ApmConfig $apm;

    public function __construct(
        VersionConfig $version,
        LogConfig $log = new LogConfig(),
        ApmConfig $apm = new ApmConfig(),
        GeneralConfig $general = new GeneralConfig()
    ) {
        $this->version = $version;
        $this->log = $log;
        $this->apm = $apm;
        $this->general = $general;
    }
}