<?php

namespace APM\System\User;

use ThomasInstitut\ObjectData\Exportable;

class UserData implements Exportable
{

    /**
     * The row id in the user table.
     *
     * To be used ONLY when dealing with the database.
     * DO NOT use for identifying a user in any other case.
     * @var int
     */
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
    public string $emailAddress;

    public function __construct()
    {
        $this->id = -1;
        $this->tid = -1;
        $this->userName = '';
        $this->passwordHash = '';
        $this->emailAddress = '';
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