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

    public function getLanguageCode(int $langId): string|null
    {
        try {
            $langData = $this->entitySystem->getEntityData($langId);
            $code = $langData->getObjectForPredicate(Entity::pLangIso639Code);
            if (is_int($code)) {
                throw new RuntimeException("Integer language code not expected");
            }
            return $code;
        } catch (EntityDoesNotExistException) {
            return null;
        }
    }

    public function getSupportedTranscriptionLanguageCodes(): array
    {
        return ['la', 'ar', 'he', 'jrb'];
    }

    public function getLegacyLangInfo(string $langCode): array
    {
        return match ($langCode) {
            'ar' => [ 'code' => 'ar', 'name' => 'Arabic', 'rtl' => true, 'fontsize' => 5],
            'he' => [ 'code' => 'he', 'name' => 'Hebrew', 'rtl' => true, 'fontsize' => 3],
            'la' => [ 'code' => 'la', 'name' => 'Latin', 'rtl' => false, 'fontsize' => 3],
            'jrb' => [ 'code' => 'jrb', 'name' => 'Judeo Arabic', 'rtl' => true, 'fontsize' => 3],
            default => null,
        };
    }
}