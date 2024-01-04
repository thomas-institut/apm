<?php

namespace APM\System;

use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\UUID\Uuid;

class ApmEditionSourceManager extends EditionSourceManager
implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    private MySqlDataTable $table;

    public function __construct(MySqlDataTable $sqlTable)
    {
        $this->table = $sqlTable;
    }

    function getSourceByTid(int $tid): array
    {
        $rows = $this->table->findRows(['tid' => $tid]);
        if (count($rows) === 0) {
            throw  new InvalidArgumentException("Source $tid not found");
        }
        return $this->mySqlRowToInfoObject($rows[0]);
    }

    private function mySqlRowToInfoObject($mySqlRow) : array{
        return [
            'title' => $mySqlRow['title'],
            'description' => $mySqlRow['description'],
            'defaultSiglum' => $mySqlRow['default_siglum'],
            'tid' => $mySqlRow['tid']
        ];
    }

    function getAllSources(): array
    {
        $rows = $this->table->getAllRows();
        $infoObjectArray = [];
        foreach ($rows as $row) {
            $infoObjectArray[] = $this->mySqlRowToInfoObject($row);
        }
        return $infoObjectArray;
    }
}