<?php

namespace APM\System\Config;

use ThomasInstitut\Settable\SettableFromArray;

class ApmSystemConfig implements SettableFromArray
{
    public GeneralConfig $general;

    public function fromArray(array $config): void
    {
        $this->general = new GeneralConfig();
        $this->general->fromArray($config);
    }
}