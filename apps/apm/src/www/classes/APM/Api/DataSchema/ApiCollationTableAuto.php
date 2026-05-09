<?php

namespace APM\Api\DataSchema;

use stdClass;

class ApiCollationTableAuto
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