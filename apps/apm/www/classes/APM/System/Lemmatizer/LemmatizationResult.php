<?php

namespace APM\System\Lemmatizer;

class LemmatizationResult
{
public function __construct(
    public array $tokens = [],
    public array $lemmata = []
)
{
}
}