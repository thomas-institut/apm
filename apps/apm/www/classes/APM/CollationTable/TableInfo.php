<?php

namespace APM\CollationTable;

class TableInfo
{

    public int $id = -1;
    public string $title = '';
    public string $workId = '';
    public string $chunkId = '';
    public int $chunkNumber = -1;
    public string $type = '';
    public string $lastChange = '';
    /**
     * @var string[]
     */
    public array $witnesses = [];
    public CollationTableVersionInfo|null $lastVersion = null;
}