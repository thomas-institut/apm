<?php

namespace APM\EntitySystem\Kernel;

class PredicateFlag
{

    /**
     * When set, the predicate can only be used in statement metadata
     */
    const StatementMetadata = 1;

    /**
     * When set, the predicate can only be used in cancellation metadata
     */
    const CancellationPredicate = 2;

    /**
     * When set, the predicate can only be used in a merge operation
     */
    const MergePredicate = 3;

    const QualificationPredicate = 4;
}