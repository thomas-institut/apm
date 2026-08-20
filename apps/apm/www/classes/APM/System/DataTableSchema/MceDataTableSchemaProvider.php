<?php

namespace APM\System\DataTableSchema;

use ThomasInstitut\DataTable\Schema\ColumnDataType;
use ThomasInstitut\DataTable\Schema\ColumnDefinition;
use ThomasInstitut\DataTable\Schema\DataTableSchema;

final class MceDataTableSchemaProvider implements ApmDataTableSchemaProvider
{

    public static function getSchema(): DataTableSchema
    {
        $columnDefs = [
            new ColumnDefinition('id', ColumnDataType::Id),
            (new ColumnDefinition('title', ColumnDataType::VarChar))
                ->withTypeLength(128)
                ->withRequired(true),
            (new ColumnDefinition('author_tid', ColumnDataType::Integer))
                ->withRequired(true),
            (new ColumnDefinition('chunks', ColumnDataType::VarChar))
                ->withTypeLength(4192)
                ->withRequired(true),
            (new ColumnDefinition('version_description', ColumnDataType::VarChar))
                ->withTypeLength(2048)
                ->withRequired(true),
            (new ColumnDefinition('mce_data',ColumnDataType::Text))->withRequired(true),
            (new ColumnDefinition('compressed', ColumnDataType::Boolean))->withRequired(true),
            (new ColumnDefinition('archived', ColumnDataType::Boolean))->withRequired(true),
            new ColumnDefinition('valid_from', ColumnDataType::ValidFrom),
            new ColumnDefinition('valid_until', ColumnDataType::ValidUntil),
        ];
        return new DataTableSchema($columnDefs);
    }
}