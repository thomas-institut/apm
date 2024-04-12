<?php

namespace APM\Site\EntityEdition;

/**
 * A section within an EditorSchema
 */
class Section
{

    /**
     * Section name, normally used as the identifying class for the
     * section's <div>
     *
     * @var string
     */
    public string $name = '';


    /**
     * A string that can be used as the heading of the section
     * @var string
     */
    public string $title = '';

    /**
     * An identifier that defines how the section's statements will be displayed
     * @var string
     */
    public string $type = '';


    /**
     * @var Statement[]
     */
    public array $currentStatements = [];

    /**
     * @var Predicate[]
     */
    public array $availablePredicates = [];

    /**
     * If true, the section consists of statements with the same predicate, with
     * different qualifications
     * @var bool
     */
    public bool $singlePredicate = false;

}