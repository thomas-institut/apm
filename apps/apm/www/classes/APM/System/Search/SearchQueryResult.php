<?php

namespace APM\System\Search;

class SearchQueryResult
{
    public function __construct(
        public array $hits,
        public int   $page,
        public bool  $queryFinished
    )
    {
    }
}