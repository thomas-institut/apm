<?php

namespace APM\System\EntitySystem;

class EntityTypeDefinition
{

    public int $tid = -1;
    public bool $entityCreationAllowed = true;

    public bool $entitiesCanBeQueried = true;
}