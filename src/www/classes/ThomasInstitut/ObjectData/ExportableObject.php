<?php

namespace ThomasInstitut\ObjectData;

class ExportableObject
{

    /**
     * @param Exportable[] $arrayOfExportables
     * @return array
     */
    public static function getArrayExportObject(array $arrayOfExportables) : array {
        $exportObject = [];
        foreach ($arrayOfExportables as $exportable) {
            $exportObject[] = $exportable->getExportObject();
        }
        return $exportObject;
    }
}