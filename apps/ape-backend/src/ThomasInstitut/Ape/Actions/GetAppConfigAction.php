<?php

namespace ThomasInstitut\Ape\Actions;

use ThomasInstitut\Ape\ActionsSchema\AppConfig;
use ThomasInstitut\Ape\Config\SystemConfig;

readonly class GetAppConfigAction
{
    public function __construct(private SystemConfig $systemConfig)
    {
    }

    public function execute(): AppConfig
    {
        $appConfig = new AppConfig();
        $appConfig->name = $this->systemConfig->general->name;
        $appConfig->shortName = $this->systemConfig->general->shortName;
        $appConfig->version = $this->systemConfig->version->title;
        $appConfig->versionDate = $this->systemConfig->version->date;

        return $appConfig;
    }
}