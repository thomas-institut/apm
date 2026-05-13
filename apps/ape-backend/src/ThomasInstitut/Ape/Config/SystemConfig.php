<?php

namespace ThomasInstitut\Ape\Config;

use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\SettableFromArray;

class SystemConfig implements SettableFromArray
{

    public LogConfig $log;
    public VersionConfig $version;
    public GeneralConfig $general;


    public function fromArray(array $config): void
    {
        $sections = [
            'log' => LogConfig::class,
            'version' => VersionConfig::class,
        ];

        $this->general = new GeneralConfig();
        $this->general->fromArray($config);

        foreach ($sections as $section => $class) {
            $this->$section = new $class();
            try {
                if (isset($config[$section])) {
                    $this->$section->fromArray($config[$section]);
                } else {
                    $this->$section->fromArray([]);
                }
            } catch (MissingRequiredValueException $e) {
                throw new MissingRequiredValueException("Section " . $section . ': ' . $e->getMessage());
            }

        }
    }
}