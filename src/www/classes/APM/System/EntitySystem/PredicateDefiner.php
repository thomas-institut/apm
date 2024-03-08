<?php

namespace APM\System\EntitySystem;

interface PredicateDefiner extends TidDefiner
{

    /**
     * Returns the predicate definition for the given $tid.
     *
     * If the predicate is not defined in the class, returns null
     *
     * @param int $tid
     * @return PredicateDefinition|null
     */
    public function getPredicateDefinition(int $tid) : ?PredicateDefinition;

}