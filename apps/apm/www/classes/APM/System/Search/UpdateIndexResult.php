<?php

namespace APM\System\Search;

class UpdateIndexResult
{

    public function __construct(
        public int $updatesNeeded,
        public int $updatesPerformed,
        public int $deletionsPerformed,
    )
    {

    }

}