<?php

namespace APM\StringMatcher;

class StringStartMatcher extends SimpleIndexStringMatcher
{

    /**
     * Returns only the elements whose string start with
     * input string
     *
     * @param string $normalizedInput
     * @param int $maxResults
     * @return array
     */
    public function getMatches(string $normalizedInput, int $maxResults): array
    {
        $matches = [];
        $inputLength = strlen($normalizedInput);
        foreach ($this->index as $element) {
            if (substr($element->normalizedString, 0, $inputLength) === $normalizedInput) {
                $matches[] = [...$element->toTuple(), $inputLength / strlen($element->normalizedString) ];
            }
            if (count($matches) === $maxResults) {
                break;
            }
        }
        return $matches;
    }
}