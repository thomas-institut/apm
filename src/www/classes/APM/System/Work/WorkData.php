<?php

namespace APM\System\Work;

use ThomasInstitut\Exportable\Exportable;

class WorkData implements Exportable
{
    public int $tid = -1;
    public string $dareId = '';
    public int $authorTid = -1;
    public string $title ='';
    public string $shortTitle = '';
    public bool $enabled = false;

    public function getExportObject(): array
    {
        return get_object_vars($this);
    }
}