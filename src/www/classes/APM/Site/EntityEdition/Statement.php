<?php

namespace APM\Site\EntityEdition;

use APM\EntitySystem\Schema\Entity;

/**
 * A subsection of an EditorSchema that corresponds to a statement in the
 * Entity System that the displayed, edited and/or added to its section
 */
class Statement
{

    public int $statementId = -1;
    public int $authorTid = -1;
    public int $timestamp = -1;
    public string $editorialNote = '';

    public Predicate $predicate;

    public string|int $object = '';

    public bool $mustHaveEditorialNote = true;


    /**
     * Array of pairs [ qualificationPredicate, qualification]
     * @var array
     */
    public array $qualifications = [];



}