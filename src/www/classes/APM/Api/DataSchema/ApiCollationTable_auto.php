<?php

namespace APM\Api\DataSchema;

use stdClass;

class ApiCollationTable_auto
{
    public string $type;
    public array $collationEngineDetails;
    public stdClass $collationTable;
    /**
     * @var string[]
     */
    public array $automaticNormalizationsApplied;
    public array $people;
}