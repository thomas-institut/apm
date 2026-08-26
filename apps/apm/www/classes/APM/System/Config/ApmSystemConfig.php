<?php

namespace APM\System\Config;

final readonly class ApmSystemConfig
{

    public function __construct(
        public VersionConfig     $version,
        public NodeServiceConfig $nodeService,
        public GeneralConfig     $general = new GeneralConfig(),
        public UrlConfig         $url = new UrlConfig(),
        public LogConfig         $log = new LogConfig(),
        public DbConfig          $db = new DbConfig(),
        public ValkeyConfig      $valkey = new ValkeyConfig()
    )
    {
    }
}