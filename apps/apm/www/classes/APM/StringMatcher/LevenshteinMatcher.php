<?php

namespace APM\StringMatcher;

use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;

class LevenshteinMatcher extends SimpleIndexStringMatcher implements LoggerAwareInterface
{

    use LoggerAwareTrait;
    private int $threshold;

    public function __construct(array $index)
    {
        parent::__construct($index);
        $this->logger = new NullLogger();
        $this->threshold = 35;
    }

    public function setThreshold(int $threshold) : void {
        $this->threshold = $threshold;
    }

    public function getMatches(string $normalizedInput, int $maxResults): array
    {
        $distances = [];
        foreach ($this->index as $i => $element) {
            $distance = levenshtein($normalizedInput, $element->normalizedString);
//            $this->logger->debug("Element $i '$element->normalizedString': distance = $distance");
            $distances[] = [ 'index' => $i, 'distance' => $distance ];
        }

        $indexArray = array_column($distances, 'index');
        $distanceArray = array_column($distances, 'distance');

        array_multisort($distanceArray, SORT_ASC, $indexArray, SORT_ASC, $distances);

        $matches = [];

        for ($i = 0; $i < $maxResults; $i++) {
            if ($distances[$i]['distance'] <= $this->threshold) {
                $matches[] = [ ...$this->index[$distances[$i]['index']]->toTuple(), $this->getScoreFromDistance($distances[$i]['distance'])];
            }
        }

        return $matches;
    }

    private function getScoreFromDistance(int $distance) : float {
        if ($distance === 0) {
            return 1;
        }

        return 1 / ($distance + 1);
    }


}