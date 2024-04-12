<?php

namespace APM\Site\EntityEdition;

use APM\EntitySystem\Schema\Entity;

class Predicate
{
    /**
     * Predicate entity ID
     * @var int
     */
    public int $tid = -1;

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
     * If true, the object must be an entity
     * @var bool
     */
    public bool $isRelation = false;

    // if $isRelation is true:
    public int $objectPredicateToDisplay = Entity::pEntityName;
    public string $objectUrlType = '';
    public array $validObjectTypes = [];
    public bool $canBeSelf = false;

    // is $isRelation is false:

    public string $value = '';
    public string $validatorName = '';
    public array $validatorSettings = [];


    /**
     * @var int[]
     */
    public array $allowedQualificationPredicates = [];
}