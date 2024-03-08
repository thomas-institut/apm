<?php

namespace APM\System\EntitySystem;

interface EntityTypeDefiner extends TidDefiner
{
    public static function getEntityTypeDefinition(int $tid): ?EntityTypeDefinition;
}