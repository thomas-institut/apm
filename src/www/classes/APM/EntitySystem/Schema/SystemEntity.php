<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\EntityDefiner;
use APM\EntitySystem\Kernel\EntityDefinition;

class SystemEntity implements EntityDefiner
{

    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        $def = new EntityDefinition();
        $def->id = Entity::System;
        $def->name = 'System';
        $def->description = "The system itself, normally used as the author of automatically generated statements";
        return [ $def];
    }
}