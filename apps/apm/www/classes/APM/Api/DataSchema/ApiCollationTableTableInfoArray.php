<?php

namespace APM\Api\DataSchema;

use APM\CollationTable\TableInfo;
use ThomasInstitut\StandardApi\SuccessResponse;

class ApiCollationTableTableInfoArray extends SuccessResponse
{
    /**
     * @var TableInfo[]
     */
    public array $tableInfoArray;
}