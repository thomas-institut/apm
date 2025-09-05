<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;


const BibObjectDefinitions = [
    [ Entity::BibObjectBook, 'Book', 'Bibliographical Object Book'],
    [ Entity::BibObjectBookSection, 'Book Section', 'Bibliographical Object Book Section'],
    [ Entity::BibObjectArticle, 'Article', 'Bibliographical Object Article'],
    [ Entity::BibObjectJournal, 'Journal', 'Bibliographical Object Journal'],
    [ Entity::BibObjectBookSeries, 'Series', 'Bibliographical Object Series'],
    [ Entity::BibObjectOnlineCatalog, 'Online Catalog', 'Bibliographical Object Online Catalog'],
    [ Entity::BibObjectOldCatalog, 'Old Catalog', 'Bibliographical Object Old Catalog']
];

class BibObjects implements EntityDefiner
{
    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
      return DefsFromArray::getEntityDefinitionsFromArray(BibObjectDefinitions, Entity::tBibObject);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}


