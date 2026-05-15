<?php

namespace APM\System\Config;

use Exception;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\SettableFromArray;
use ThomasInstitut\Settable\WrongValueTypeException;

class ApmSystemConfig implements SettableFromArray
{
    public GeneralConfig $general;
    public UrlConfig $url;
    public VersionConfig $version;
    public LogConfig $log;

    /**
     * @throws WrongValueTypeException
     * @throws MissingRequiredValueException
     * @throws Exception
     */
    public function fromArray(array $config): void
    {

        $this->general = new GeneralConfig();
        $this->general->fromArray($config);

        try {
            $this->url = new UrlConfig();
            $this->url->fromArray($config['url'] ?? []);
        } catch (Exception $e) {
            throw new Exception('"url" config: ' . $e->getMessage());
        }

        try {
            $this->version = new VersionConfig();
            $this->version->fromArray($config['version'] ?? []);
        } catch (Exception $e) {
            throw new Exception('"version" config: ' . $e->getMessage());
        }

        try {
            $this->log = new LogConfig();
            $this->log->fromArray($config['log'] ?? []);
        } catch (Exception $e) {
            throw new Exception('"log" config: ' . $e->getMessage());
        }
    }
}