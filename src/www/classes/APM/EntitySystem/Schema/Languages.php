<?php

namespace APM\EntitySystem\Schema;

use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;
use APM\EntitySystem\Kernel\EntityDefinition;
use mysql_xdevapi\Statement;

class Languages implements EntityDefiner
{
    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        $defs = [];

        foreach (LanguageDefinitions as $languageDefinition) {
            $def = new EntityDefinition();
            [ $tid, $name, $description ] = $languageDefinition;
            $def->id = $tid;
            $def->type = Entity::tLanguage;
            $def->name = $name;
            $def->description = $description;
            $def->translatedNames = [];
            $def->translatedDescriptions = [];
            $def->deprecated = false;
            $def->deprecationNotice =  '';
            $defs[] = $def;
        }
        return $defs;
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        $statements = [];
        foreach (LanguageDefinitions as $languageDefinition) {
            [ $id, , , $code ] = $languageDefinition;
            $statements[] = [ $id, Entity::pLangIso639Code, $code];
        }
        return $statements;
    }
}
const LanguageDefinitions = [
    [ Entity::LangArabic, 'Arabic', 'Arabic Language', 'ar'],
    [ Entity::LangHebrew, 'Hebrew', 'Hebrew Language', 'he'],
    [ Entity::LangLatin, 'Latin', 'Latin Language', 'la'],
    [ Entity::LangJudeoArabic, 'Judeo Arabic', 'Judeo Arabic Language', 'jrb'],
    [ Entity::LangAncientGreek, 'Ancient Greek', 'Ancient Greek Language', 'grc'],
    [ Entity::LangEnglish, 'English', 'English Language', 'en'],
    [ Entity::LangGerman, 'German', 'GermanLanguage', 'de'],
    [ Entity::LangFrench, 'French', 'French Language', 'fr'],
    [ Entity::LangItalian, 'Italian', 'Italian Language', 'it'],
    [ Entity::LangSpanish, 'Spanish', 'Spanish Language', 'es'],
    [ Entity::LangPortuguese, 'Portuguese', 'Portuguese Language', 'pt'],
    [ Entity::LangTurkish, 'Turkish', 'Turkish Language', 'tr'],
];

