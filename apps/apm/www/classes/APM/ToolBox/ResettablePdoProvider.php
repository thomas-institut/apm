<?php

namespace APM\ToolBox;

use PDO;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class ResettablePdoProvider implements PdoProvider
{

    /** @var callable(mixed): PDO */
    private $pdoBuilder;

    private ?PDO $pdo = null;

    /**
     * Constructs a PdoProvider that can be reset
     *
     * It requires a callable that takes a single parameter and returns a PDO instance. This will be used
     * to create the PDO the first time getPdo is called after construction or after reset is called.
     *
     * @param callable $pdoBuilder
     * @param mixed $builderParam
     */
    public function __construct(callable $pdoBuilder, private mixed $builderParam)
    {
        $this->pdoBuilder = $pdoBuilder;
    }

    public function getPdo(): PDO
    {
        if ($this->pdo === null) {
            $this->pdo = ($this->pdoBuilder)($this->builderParam);
        }
        return $this->pdo;
    }

    public function reset(): void
    {
        $this->pdo = null;
    }
}