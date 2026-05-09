<?php

namespace APM\EntitySystem\Kernel;

class PredicateFlag
{

    /**
     * When set, the predicate can only be used in statement metadata
     */
    const int StatementMetadata = 1;

    /**
     * When set, the predicate can only be used in cancellation metadata
     */
    const int CancellationPredicate = 2;

    /**
     * When set, the predicate can only be used in a merge operation
     */
    const int MergePredicate = 3;

    /**
     * When set, the predicate can only be used for statement qualifications
     */
    const int QualificationPredicate = 4;

    /**
     * When set, the predicate is meant to be used by the entity system internally
     * and therefore should not be available for users when making statements
     */
    const int SystemPredicate = 5;
}