<?php

namespace APM\EntitySystem\Schema;


const DocumentTypesDefinitions = [

    [
        Entity::DocTypeManuscript,
        'Manuscript',
        'Manuscript',
        [],
        [],
        false, // not deprecated
        ''
    ],
    [
        Entity::DocTypePrint,
        'Print',
        'A printed document, e.g. a book',
        [],
        [],
        false, // not deprecated
        ''
    ],
    [
        Entity::DocTypeIncunabulum,
        'Incunabulum',
        'An incunabulum',
        [],
        [],
        false, // not deprecated
        ''
    ],

];


use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;

class DocumentTypes implements EntityDefiner
{


    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(DocumentTypesDefinitions, Entity::tDocumentType);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}