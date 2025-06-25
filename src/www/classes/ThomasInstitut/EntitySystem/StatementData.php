<?php

namespace ThomasInstitut\EntitySystem;


class StatementData
{
    public int $id = -1;
    public int $subject = -1;
    public int $predicate = -1;
    public int|string $object = -1;
    public array $statementMetadata = [];
    public int $cancellationId = -1;
    public array $cancellationMetadata = [];

    public function isCancelled() : bool
    {
        return $this->cancellationId !== -1;
    }

}