<?php

namespace APM\System;

interface LanguageManager
{
    public function getLanguageCode(int $langId) : string|null;

    /**
     * Returns the language codes of all languages supported for transcriptions
     * @return array<string>
     */
    public function getSupportedTranscriptionLanguageCodes(): array;

    /**
     * Returns the legacy lang info that used to come from the defaults yaml configuration file
     * @param string $langCode
     * @return array<string, mixed> | null
     * @deprecated
     */
    public function getLegacyLangInfo(string $langCode) : array|null;

}