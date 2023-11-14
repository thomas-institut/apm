<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\ObjectData\Exportable;
use ThomasInstitut\ObjectData\ExportableObject;

class EntityData implements Exportable
{
    public int $tid = -1;
    public bool $isDefined = false;

    public string $type = '';
    public bool $isMerged = false;
    public int $mergedInto = -1;
    public int $mergedBy = -1;
    public int $mergeTimestamp = 0;


    /**
     * @var StatementData[]
     */
    public array $attributes = [];
    /**
     * @var StatementData[]
     */
    public array $relations = [];

    /**
     * @var StatementData[]
     */
    public array $relationsAsObject = [];


    public function getExportObject(): array
    {
        $exportObject = get_object_vars($this);
        $exportObject['className'] = ExportClasses::ENTITY_DATA;
        $exportObject['attributes'] = ExportableObject::getArrayExportObject($this->attributes);
        $exportObject['relations']  = ExportableObject::getArrayExportObject($this->relations);
        $exportObject['relationsAsObject'] = ExportableObject::getArrayExportObject($this->relationsAsObject);
        return $exportObject;
    }
}