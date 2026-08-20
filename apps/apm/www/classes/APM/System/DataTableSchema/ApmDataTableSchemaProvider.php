<?php

namespace APM\System\DataTableSchema;

use ThomasInstitut\DataTable\Schema\DataTableSchema;

interface ApmDataTableSchemaProvider
{
    public static function getSchema(): DataTableSchema;

}