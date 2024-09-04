<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;

const AreaTypesDef = [

    [ Entity::AreaTypeCountry, 'Country', 'A world country, e.g., Germany, Spain'],
    [ Entity::AreaTypeCountryPart, 'Country Part', 'A part of a country, e.g. England in the UK'],
    [ Entity::AreaTypeProvince, 'Province', 'A province within a country, e.g. Alberta in Canada'],
    [ Entity::AreaTypeState, 'State', 'A state within a country, e.g., California in USA, Saxony in Germany; use Province in Canada'],
    [ Entity::AreaTypeCity, 'City', 'A city, e.g, Cologne, New York City'],
    [ Entity::AreaTypeCounty, 'County', 'A county within a state or area, e.g., Montgomery County in Maryland, USA; Clwyd in Wales'],
    [ Entity::AreaTypeCanton, 'Canton', 'A canton, e.g. Graubünden in Switzerland'],
];



class AreaTypes implements EntityDefiner
{


    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(AreaTypesDef, Entity::tAreaType);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}