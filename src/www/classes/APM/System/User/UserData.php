<?php

namespace APM\System\User;

use ThomasInstitut\ObjectData\Exportable;

class UserData implements Exportable
{

    public int $id;
    public int $tid;
    public string $userName;
    public bool $disabled;
    public bool $readOnly;
    public bool $root;
    /**
     * @var string[]
     */
    public array $tags;

    public string $passwordHash;

    public function __construct()
    {
        $this->id = -1;
        $this->tid = -1;
        $this->userName = '';
        $this->passwordHash = '';
        $this->disabled = false;
        $this->root = false;
        $this->readOnly = false;
        $this->tags = [];
    }

    public function getExportObject(): array
    {
       return get_object_vars($this);
    }
}