<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\ObjectData\Exportable;

class StatementData implements Exportable
{
    public int $tid = -1;
    public bool $isAttribute = true;

    public int $subject = -1;
    public string $predicate = '';
    public string $value = '';
    public int $object = -1;
    public string $dateFrom = '';
    public string $dateUntil  = '';
    public int $seq = -1;

    public int $editedBy = -1;
    public int $timestamp = 0;
    public string $note = '';

    public bool $isCancelled = false;
    public int $cancelledBy = -1;
    public int $cancellationTimestamp = 0;
    public string $cancellationNote = '';

    // TODO: add statement metadata


    public function getExportObject(): array
    {
       $exportObject = get_object_vars($this);
       $exportObject['className'] = ExportClasses::STATEMENT_DATA;
       return $exportObject;
    }


}