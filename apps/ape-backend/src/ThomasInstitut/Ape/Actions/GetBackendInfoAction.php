<?php

namespace ThomasInstitut\Ape\Actions;

use ThomasInstitut\Ape\ActionsSchema\BackendInfo;
use ThomasInstitut\Ape\Config\SystemConfig;

readonly class GetBackendInfoAction
{
    public function __construct(private SystemConfig $systemConfig)
    {
    }

    public function execute(): BackendInfo
    {
        $serverInfo = new BackendInfo();
        $serverInfo->name = $this->systemConfig->general->name;
        $serverInfo->version = $this->systemConfig->version->title;
        $serverInfo->versionDate = $this->systemConfig->version->date;

        return $serverInfo;
    }
}