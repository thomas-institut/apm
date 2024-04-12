<?php

namespace APM\Site\EntityEdition;

/*
 * A class that represents the schema to be passed to the JS app for
 * the edition of entities.
 *
 * An entity editor consists of a title header, normally with the
 * name of the entity, and a number of sections to be displayed
 * consecutively. The editor's class defines how the sections are actually displayed.
 *
 * Each section consists of an optional title, a list of statements that may be edited and a list of
 * predicates that can be added to the section as new statements. For example, for person,
 * one section can be all the statements for external ids, showing all the currently set ones and
 * an "Add New" button for others that may be added.
 *
 */
class EditorSchema
{
    /**
     * Entity's Tid
     * @var int
     */
    public int $tid = -1;

    public string $class = '';

    /**
     * @var Section[]
     */
    public array $sections = [];

}