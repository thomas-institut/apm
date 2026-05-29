<?php

namespace ThomasInstitut\EntitySystem;


use OpenApi\Attributes as OA;

#[OA\Schema]
class StatementData
{
    #[OA\Property]
    public int $id = -1;
    #[OA\Property]
    public int $subject = -1;
    #[OA\Property]
    public int $predicate = -1;
    #[OA\Property(
        description: 'The object of the statement: an entity id or a literal value.',
        oneOf: [ new OA\Schema(type: 'string'), new OA\Schema(type: 'integer')])
    ]
    public int|string $object = -1;
    #[OA\Property]
    public array $statementMetadata = [];
    #[OA\Property]
    public int $cancellationId = -1;
    #[OA\Property]
    public array $cancellationMetadata = [];

    public function isCancelled() : bool
    {
        return $this->cancellationId !== -1;
    }

}