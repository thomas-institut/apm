<?php

namespace APM\System\Factories;

use APM\System\ApmTableNames;
use APM\System\Preset\DataTablePresetManager;
use APM\System\Preset\PresetManager;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class PresetManagerFactory
{

    public static function create(PdoProvider $pdoProvider, ApmTableNames $tableNames): PresetManager
    {
        $presetsManagerDataTable = new MySqlDataTable($pdoProvider, $tableNames->presets);
        return new DataTablePresetManager($presetsManagerDataTable, ['lang' => 'key1']);
    }
}