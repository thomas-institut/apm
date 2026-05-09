<?php

namespace APM\StringMatcher;

interface StringMatcher
{

    /**
     * Returns an array with the $maxResults best matches to the given input.
     *
     * It is assumed that the search is conducted over a previously given array of
     * records, each one with a unique integer id that will be reported in the results.
     * Each record has at least one string associated with it that will be used for matching.
     *
     * Each element of the return array is itself an array describing the match:
     *
     *   [ recordId, matchedString, stringType, score ]
     *
     * Matching score is a number between 0 and 1. If score === 1, the match is perfect.
     * It is up to the class to determine a score threshold for results.
     *
     * stringType is a string or int identifier that reports the kind of string the result refers
     * to within the record. For example, 'name', 'alias', etc.
     *
     * @param string $normalizedInput
     * @param int $maxResults
     * @return array
     */
    public function getMatches(string $normalizedInput, int $maxResults) : array;
}