<?php

namespace APM\StringMatcher;

abstract class SimpleIndexStringMatcher implements StringMatcher
{

    protected array $index;

    /**
     * Construct the matcher with the given index.
     * Each element in the
     * @param SimpleIndexElement[] $index
     */
    public function __construct(array $index)
    {
        $this->index = $index;
    }

    abstract public function getMatches(string $normalizedInput, int $maxResults) : array;
}