<?php

namespace APM\System\Person;

use ThomasInstitut\Exportable\Exportable;

class PersonEssentialData implements Exportable
{

    public int $tid;
    public string $name;
    public string $sortName;
    public array $extraAttributes;

    public string $userName;
    public array $userTags;

    public bool $isUser;
    public string $userEmailAddress;

    public function __construct()
    {
        $this->tid = -1;
        $this->name = '';
        $this->sortName = '';
        $this->isUser = false;
        $this->userName = '';
        $this->userEmailAddress = '';
        $this->userTags = [];
        $this->extraAttributes = [];
    }

    public function getExportObject(): array
    {
        return get_object_vars($this);
    }

}