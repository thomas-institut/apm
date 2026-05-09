<?php

namespace APM\EntitySystem\EntityEdition;

/**
 * A section within an EditorSchema
 *
 * A section is a collection of predicates that are shown together and may be edited together as well.
 * Normally, statements can be edited individually, but they can also be edited together as a section. This depends
 * on the section type in the JS app.
 */
class Section
{

    /**
     * The section type in the JS app
     * @var string
     */
    public string $type = '';


    /**
     * If the section type provides edition of the section as a whole, setting this to false
     * turns that option off.
     * @var bool
     */
    public bool $editable = true;

    /**
     * A string that can be used as the heading of the section
     * @var string
     */
    public string $title = '';

    /**
     * An ordered list of predicates in the section
     * @var Predicate[]
     */
    public array $predicates = [];

    /**
     * If true, the section consists of statements with the same predicate, with
     * different qualifications.
     *
     * @var bool
     */
    public bool $singlePredicate = false;

    /**
     * List of qualification predicate ids that must be shown for every statement
     * in the section.
     *
     * Normally this is used in single predicate sections to build some sort of table.
     * @var int[]
     */
    public array $qualificationPredicates = [];

}