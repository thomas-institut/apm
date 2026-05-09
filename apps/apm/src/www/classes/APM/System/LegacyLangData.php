<?php

namespace APM\System;

use APM\EntitySystem\Schema\Entity;

class LegacyLangData
{

    /**
     * Returns the language for a given language id
     *
     * @param int $langId
     * @return string
     * @deprecated Use entity system functions if possible
     */
    static public function getLangCode(int $langId) : string {
        $codes = [];
        $codes[Entity::LangArabic] = 'ar';
        $codes[Entity::LangLatin] = 'la';
        $codes[Entity::LangHebrew] = 'he';
        $codes[Entity::LangJudeoArabic] = 'jrb';
        $codes[Entity::LangAncientGreek] = 'grc';
        $codes[Entity::LangEnglish] = 'en';
        $codes[Entity::LangFrench] = 'fr';
        $codes[Entity::LangGerman] = 'de';
        $codes[Entity::LangSpanish] = 'es';
        $codes[Entity::LangPortuguese] = 'pt';

        return $codes[$langId] ?? '';
    }
}