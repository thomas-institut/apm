<?php

namespace APM\Api\Action;

class PageUpdateDefinition
{
    public ?int $docId;
    public ?int $page;
    public ?int $type;
    public ?string $foliation;
    public ?bool $overwriteFoliation;
    public ?int $cols;
    public ?int $lang;


    public static function fromArray(array $data): self
    {
        $def = new self();
        $def->docId = isset($data['docId']) ? intval($data['docId']) : null;
        $def->page = isset($data['page']) ? intval($data['page']) : null;
        $def->type = isset($data['type']) ? intval($data['type']) : null;
        $def->foliation = isset($data['foliation']) ? (string)$data['foliation'] : null;
        $def->overwriteFoliation = isset($data['overwriteFoliation']) ? (bool)$data['overwriteFoliation'] : null;
        $def->cols = isset($data['cols']) ? intval($data['cols']) : null;
        $def->lang = isset($data['lang']) ? intval($data['lang']) : null;
        return $def;
    }
}