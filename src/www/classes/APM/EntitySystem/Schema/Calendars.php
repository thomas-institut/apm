<?php

namespace APM\EntitySystem\Schema;


use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;

const CalendarDefinitions = [
    [ Entity::CalendarGregorian, 'Gregorian', 'Gregorian calendar'],
    [ Entity::CalendarJulian, 'Julian', 'Julian calendar'],
    [ Entity::CalendarIslamicObservational, 'Islamic', 'Islamic observational/traditional calendar'],
    [ Entity::CalendarIslamicTabular, 'Islamic (Tabular)', 'Islamic standard tabular/calculated calendar'],
    [ Entity::CalendarIslamicTabularUlughBeg, 'Islamic (Ulugh Beg)', 'Islamic tabular/calculated calendar, Ulugh Beg parameters'],
    [ Entity::CalendarIslamicTabularBohras, 'Islamic (Bohras)', 'Islamic tabular/calculated calendar, Bohras parameters'],
    [ Entity::CalendarHebrewObservational, 'Hebrew', 'Hebrew observational/traditional calendar'],
    [ Entity::CalendarHebrewCalculated, 'Hebrew (Tabular)', 'Hebrew standard tabular/calculated calendar'],
];

class Calendars implements EntityDefiner
{

    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(CalendarDefinitions, Entity::tCalendar);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
       return [];
    }
}