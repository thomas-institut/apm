<?php

namespace APM\System\Person;

use ThomasInstitut\ObjectData\Exportable;

class PersonEssentialData implements Exportable
{

    public int $tid;
    public string $name;
    public string $sortName;
    public array $extraAttributes;

    /**
     * Internal system ID (e.g., a database row id)
     *
     * Should not be used for identifying a person. Use the person's tid instead.
     *
     * @var int
     * @deprecated
     */
    public int $id;
    public string $userName;
    public array $userTags;

    public bool $isUser;
    public string $userEmailAddress;

    public string $slug;

    public function __construct()
    {
        $this->id = -1;
        $this->tid = -1;
        $this->name = '';
        $this->sortName = '';
        $this->isUser = false;
        $this->userName = '';
        $this->userEmailAddress = '';
        $this->userTags = [];
        $this->extraAttributes = [];
        $this->slug = '';
    }

    public function getExportObject(): array
    {
        return get_object_vars($this);
    }

}