<?php

namespace APM\System\Person;

use ThomasInstitut\ObjectData\Exportable;

class PersonEssentialData implements Exportable
{

    public int $tid;
    public string $name;
    public string $sortName;
    /**
     * @var false
     */
    public bool $isUser;
    public array $extraAttributes;

    /**
     * Internal system ID (e.g., a database row id)
     * @var int
     */
    public int $id;
    public string $userName;

    public function __construct()
    {
        $this->id = -1;
        $this->tid = -1;
        $this->name = '';
        $this->sortName = '';
        $this->isUser = false;
        $this->userName = '';
        $this->extraAttributes = [];
    }

    public function getExportObject(): array
    {
        return get_object_vars($this);
    }

}