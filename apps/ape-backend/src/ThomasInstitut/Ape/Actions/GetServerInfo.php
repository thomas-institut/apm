<?php

namespace ThomasInstitut\Ape\Actions;

use ThomasInstitut\Ape\ActionsSchema\ServerInfo;
use ThomasInstitut\Ape\Config\SystemConfig;

readonly class GetServerInfo
{
    public function __construct(private SystemConfig $systemConfig)
    {
    }

    public function execute(): ServerInfo
    {
        $serverInfo = new ServerInfo();
        $serverInfo->name = $this->systemConfig->general->name;
        $serverInfo->version = $this->systemConfig->version->title;
        $serverInfo->versionDate = $this->systemConfig->version->date;

        return $serverInfo;
    }
}