<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\Exportable\Exportable;

class StatementData implements Exportable
{
    public int $tid = -1;
    public int $statementGroup = -1;
    public int $subject = -1;
    public int $predicate = -1;
    public int $object = -1;
    public string $value = '';
    public array $qualifications;
    public array $metadata;
    public bool $isCancelled = false;
    public int $cancelledBy = -1;
    public int $cancellationTimestamp = 0;
    public string $cancellationNote = '';

    public function getExportObject(): array
    {
       $exportObject = get_object_vars($this);
       $exportObject['className'] = ExportClasses::STATEMENT_DATA;
       return $exportObject;
    }


}