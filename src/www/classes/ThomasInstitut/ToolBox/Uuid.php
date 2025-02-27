<?php

namespace ThomasInstitut\ToolBox;

class Uuid
{
    static function bin2str(string $data) : string {
        $data = substr($data, 0, 16);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}