<?php

namespace APM\EntitySystem\Schema;


const PageTypeDefinitions = [

    [
        Entity::PageTypeNotSet,
        'Type not set',
        'Type not set',
        [],
        [],
        false,
        ''
    ],
    [
        Entity::PageTypeText,
        'Regular page with text',
        'Regular page with text',
        [],
        [],
        false,
        ''
    ],
    [
        Entity::PageTypeFrontMatter,
        'Front matter',
        'Front matter',
        [],
        [],
        false,
        ''
    ],
    [
        Entity::PageTypeBackMatter,
        'Back matter',
        'Back matter',
        [],
        [],
        false,
        ''
    ],

];


use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;

class PageTypes implements EntityDefiner
{


    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(PageTypeDefinitions, Entity::tPageType);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}