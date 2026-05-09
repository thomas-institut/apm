<?php

namespace APM\Api\PersonInfoProvider;

use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
use APM\ToolBox\FullName;


/**
 * Temporary class needed to couple the old witness html generation code
 * with APM's PersonManager
 */
class ApmPersonInfoProvider implements PersonInfoProvider
{

    private PersonManagerInterface $personManager;

    public function __construct(PersonManagerInterface $pm)
    {
        $this->personManager = $pm;
    }

    /**
     * @inheritDoc
     */
    public function getNormalizedName(int $personTid): string
    {
        try {
            $data = $this->personManager->getPersonEssentialData($personTid);
        } catch (PersonNotFoundException) {
            return "Non-existent Person $personTid";
        }
        return $data->name;
    }

    /**
     * @inheritDoc
     */
    public function getShortName(int $personTid): string
    {
        try {
            $data = $this->personManager->getPersonEssentialData($personTid);
        } catch (PersonNotFoundException) {
            return "UNK $personTid";
        }
        return $data->shortName ?? FullName::getShortName($data->name);
    }
}