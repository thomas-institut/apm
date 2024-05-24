<?php

namespace APM\StringMatcher;


class PerfectMatchMatcher extends SimpleIndexStringMatcher
{

    /**
     * Returns only the first perfect match in the index
     *
     * @param string $normalizedInput
     * @param int $maxResults
     * @return array
     */
    public function getMatches(string $normalizedInput, int $maxResults): array
    {
        foreach($this->index as $element) {
            if ($normalizedInput === $element->normalizedString) {
                return [ [...$element->toTuple(), 1.0] ];
            }
        }
        return [];
    }
}