<?php

namespace APM\StringMatcher;

use APM\StringMatcher\SimpleIndexStringMatcher;

/**
 * String matcher that attempts to find meaningful matches to names consisting
 * of a number of words.
 *
 * The scores are assigned as follows:
 *
 *     1.0  =>  perfect match
 *     0.9 to 0.999999 => perfect match in one of the words: 0.9 + (0.1 / number of other words)
 *     0.7 to 0.899999 => levenshtein distance of less than 2 in one of the words =0.7 + (0.2 / number of other words)
 *     0 to 0.69999 => 0.7 / (1 + levenshtein distance of the whole string)
 *
 */
class NameMatcher extends SimpleIndexStringMatcher
{

    private array $words;

    public function __construct(array $index)
    {
        parent::__construct($index);

        $this->words = [];

        foreach ($this->index as $element) {
            $this->words[] = preg_split('/[\s\-]+/', $element->normalizedString, -1, PREG_SPLIT_NO_EMPTY);
        }

    }

    public function getMatches(string $normalizedInput, int $maxResults): array
    {
        $scores = [];

        foreach($this->index as $i => $element) {
            if ($normalizedInput === $element->normalizedString) {
                $scores[] = [ 'index' => $i, 'score' => 1.0];
                continue;
            }

            $numWordsInInput = count(preg_split('/[\s\-]+/', $normalizedInput, -1, PREG_SPLIT_NO_EMPTY));
            $numWords = count($this->words[$i]);

            $scoreFound = false;

            if ($numWordsInInput === 1) {
                foreach($this->words[$i] as $word) {
                    if ($normalizedInput === $word) {
                        $scores[]  = [ 'index' => $i, 'score' => 0.9 + 0.09999 * ($numWords === 1 ? 1 : 1 / ($numWords -1))];
                        $scoreFound = true;
                        break;
                    } else {
                        $wordLevenshteinDistance = levenshtein($word, $normalizedInput);
                        if ( $wordLevenshteinDistance <= 2) {
                            $scores[] = [ 'index' => $i, 'score'=> 0.8 + 0.0999 * ($numWords === 1 ? 1 : 1 / ($numWords -1))];
                            $scoreFound = true;
                            break;
                        }
                    }
                }
            } else {
                // give priority to substrings
                if (str_contains($element->normalizedString, $normalizedInput)) {
                    $scores[] = [ 'index' => $i, 'score' => 0.7 + 0.0999 * (1/ (strlen($element->normalizedString) - strlen($normalizedInput))) ];
                    $scoreFound = true;
                }

            }

            if (!$scoreFound) {
                $scores[] = [ 'index' => $i, 'score' => 0.6 * (1 / levenshtein($normalizedInput, $element->normalizedString) )];
            }
        }

        $indexArray = array_column($scores, 'index');
        $scoreArray = array_column($scores, 'score');

        array_multisort($scoreArray, SORT_DESC, $indexArray, SORT_ASC, $scores);


        $matches = [];
        for ($i = 0; $i < $maxResults; $i++) {
            $matches[] = [ ...$this->index[$scores[$i]['index']]->toTuple(), $scores[$i]['score'] ];
        }


        return $matches;
    }
}