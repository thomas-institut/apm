<?php

namespace ThomasInstitut\Ape\Config;

class SystemConfig
{

    public function __construct(
        public VersionConfig $version,
        public LogConfig     $log = new LogConfig(),
        public ApmConfig     $apm = new ApmConfig(),
        public GeneralConfig $general = new GeneralConfig(),
        public ValkeyConfig  $valkey = new ValkeyConfig(),
    )
    {

    }
}