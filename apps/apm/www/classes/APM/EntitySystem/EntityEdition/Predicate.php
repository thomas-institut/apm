<?php

namespace APM\EntitySystem\EntityEdition;

use APM\EntitySystem\Schema\Entity;

/**
 * The definition of a predicate within an entity editor section
 */
class Predicate
{
    /**
     * Predicate entity ID
     * @var int
     */
    public int $id = -1;

    /**
     * If true, only one statement with this predicate can appear in the section.
     * @var bool
     */
    public bool $isUniqueInSection = true;

    /**
     * If true, the predicate will be displayed even if the entity does not have statements with it.
     * @var bool
     */
    public bool $displayIfNotSet = false;

    /**
     * If true, statements with these predicate will not be saved unless the user provides
     * a non-empty editorial note.
     * @var bool
     */
    public bool $mustHaveEditorialNote = true;

    /**
     * Predicate name, normally used as a CSS class suffix for display
     *
     * @var string
     */
    public string $name = '';

    /**
     * The label to show as the predicate's name in display
     * @var string
     */
    public string $label = '';

    /**
     * Url for an icon or image to display instead of the label.
     *
     * @var string
     */
    public string $iconUrl = '';

    /**
     * A short title that may be displayed as a heading for the predicate
     * @var string
     */
    public string $title = '';

    /**
     * A longer description of the predicate that may be shown as help for the user.
     * @var string
     */
    public string $description = '';

    /**
     * If true, the object of statements with this predicate must be an entity
     * @var bool
     */
    public bool $isRelation = false;

    // if $isRelation is true:


    /**
     * The object's predicate to display instead of the object's entity ID
     *
     * (ignored if $isRelation is false)
     * @var int
     */
    public int $objectPredicateToDisplay = Entity::pEntityName;

    /**
     * A string that defines the type of url to display for the object.
     * If empty, no url will be used.
     *
     * (ignored if $isRelation is false)
     *
     * @var string
     */
    public string $objectUrlType = '';

    /**
     * A list of valid types for the object
     *
     * (ignored if $isRelation is false)
     * @var array
     */
    public array $validObjectTypes = [];


    /**
     * If true and $isRelation is also true, the user
     * is allowed to create new entities to use as object.
     * @var bool
     */
    public bool $objectCreationAllowed = true;

    /**
     * If true, the object and the subject can be the same entity.
     *
     * (ignored if $isRelation is false)
     * @var bool
     */
    public bool $objectCanBeTheSubject = false;

    // is $isRelation is false:

    /**
     * A string that set the validator to use for the value.
     *
     * (ignored if $isRelation is true)
     *
     * @var string
     */
    public string $validatorName = '';

    /**
     * Associative with settings for the validator
     *
     *  (ignored if $isRelation is true)
     * @var array
     */
    public array $validatorSettings = [];


    /**
     * List of allowed qualification predicates
     * @var int[]
     */
    public array $allowedQualificationPredicates = [];
}