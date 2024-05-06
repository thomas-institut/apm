<?php

namespace APM\EntitySystem\EntityEdition;

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
 * an "Add New" button for others that may be added.  The section schema defines the predicates
 * to be shown and the JS app will fill it with the entity data.
 *
 */

class EditorSchema
{

    /**
     * The type of entity for which this schema applies.
     * If  -1, it applies to all entities
     *
     * @var int
     */
    public int $typeId = -1;

    /**
     * The entity editor type.
     *
     * If empty, the JS app will decide.
     *
     * @var string
     */
    public string $editorType = EditorType::Default;


    /**
     * A string to show as the title for the editor.
     *
     * Normally, the JS app will show the entity's name or a combination of predicates
     * depending on the editor type. This string overrides the normal title.
     * @var string
     */
    public string $title = '';

    /**
     * The list of sections in the editor.
     *
     * Normally, an entity editor will have a default mechanism to display and edit
     * the essential entity predicates: name, description, sortName. The rest
     * of the predicates need to be specified in one of the editor's sections.
     *
     * @var Section[]
     */
    public array $sections = [];

}