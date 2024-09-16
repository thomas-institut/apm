<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;
use APM\EntitySystem\Kernel\EntityDefinition;


const LanguageDefinitions = [
    [ Entity::LangArabic, 'Arabic', 'Arabic Language'],
    [ Entity::LangHebrew, 'Hebrew', 'Hebrew Language'],
    [ Entity::LangLatin, 'Latin', 'Latin Language'],
    [ Entity::LangJudeoArabic, 'Judeo Arabic', 'Judeo Arabic Language'],
    [ Entity::LangAncientGreek, 'Ancient Greek', 'Ancient Greek Language'],
    [ Entity::LangEnglish, 'English', 'English Language'],
    [ Entity::LangGerman, 'German', 'GermanLanguage'],
    [ Entity::LangFrench, 'French', 'French Language'],
    [ Entity::LangItalian, 'Italian', 'Italian Language'],
    [ Entity::LangSpanish, 'Spanish', 'Spanish Language'],
    [ Entity::LangPortuguese, 'Portuguese', 'Portuguese Language'],
    [ Entity::LangTurkish, 'Turkish', 'Turkish Language'],
];

const IsoCodes = [
    [ Entity::LangArabic,  'ar'],
    [ Entity::LangHebrew,  'he'],
    [ Entity::LangLatin, 'la'],
    [ Entity::LangJudeoArabic,  'jrb'],
    [ Entity::LangAncientGreek,  'grc'],
    [ Entity::LangEnglish,  'en'],
    [ Entity::LangGerman, 'de'],
    [ Entity::LangFrench,  'fr'],
    [ Entity::LangItalian,  'it'],
    [ Entity::LangSpanish, 'es'],
    [ Entity::LangPortuguese,  'pt'],
    [ Entity::LangTurkish,  'tr'],
    ];

class Languages implements EntityDefiner
{
    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
      return DefsFromArray::getEntityDefinitionsFromArray(LanguageDefinitions, Entity::tLanguage);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        $statements = [];
        foreach (IsoCodes as $codeDefinition) {
            [ $id, $code ] = $codeDefinition;
            $statements[] = [ $id, Entity::pLangIso639Code, $code];
        }
        return $statements;
    }
}


