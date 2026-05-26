<?php

namespace APM\System;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use RuntimeException;

readonly class ApmLanguageManager implements LanguageManager
{
    public function __construct(private ApmEntitySystemInterface $entitySystem)
    {

    }
    public function getLanguageCode(int $langId) : string|null
    {
        try {
            $langData = $this->entitySystem->getEntityData($langId);
            $code = $langData->getObjectForPredicate(Entity::pLangIso639Code);
            if (is_int($code)) {
                throw new RuntimeException("Integer language code not expected");
            }
            return $code;
        } catch (EntityDoesNotExistException $e) {
            return null;
        }
    }

}