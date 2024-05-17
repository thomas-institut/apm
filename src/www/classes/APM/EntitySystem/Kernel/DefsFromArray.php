<?php

namespace APM\EntitySystem\Kernel;

use APM\EntitySystem\Schema\Entity;

class DefsFromArray
{
    /**
     * Builds an array of EntityDefinition objects from an array.
     *
     * Each element in the array corresponds to an entity definition:
     *
     *   ``[ tid, name, description, translatedNames, translatedDescriptions, deprecated, deprecationNotice]``
     *
     * @param array $definitionsArray
     * @param int $entityType
     * @return EntityDefinition[]
     */
    public static function getEntityDefinitionsFromArray(array $definitionsArray, int $entityType) : array {
        $defs = [];

        foreach ($definitionsArray as $type) {
            $def = new EntityDefinition();
            [ $tid, $name, $description, $trNames, $trDescriptions, $deprecated, $deprecationNotice] = $type;
            $def->id = $tid;
            $def->type = $entityType;
            $def->name = $name;
            $def->description = $description;
            $def->translatedNames = $trNames ?? [];
            $def->translatedDescriptions =  $trDescriptions ?? [];
            $def->deprecated = $deprecated ?? false;
            $def->deprecationNotice = $deprecationNotice ?? '';
            $defs[] = $def;
        }

        return $defs;
    }

    /**
     * Builds an array of EntityTypeDefinition objects from an array.
     *
     * Each element in the array corresponds to an entity definition:
     *
     *   ``[ tid, name, description, translatedNames, translatedDescriptions, isSystemType]``
     *
     * @param array $definitionsArray
     * @return EntityTypeDefinition[]
     */
    public static function getEntityTypeDefinitionsFromArray(array $definitionsArray) : array {
        $defs = [];

        foreach ($definitionsArray as $type) {
            $def = new EntityTypeDefinition();
            [ $tid, $name, $description, $trNames, $trDescriptions, $isSysType] = $type;
            $def->id = $tid;
            $def->type = Entity::tEntityType;
            $def->name = $name;
            $def->description = $description;
            $def->translatedNames = $trNames;
            $def->translatedDescriptions =  $trDescriptions;
            $def->isSystemType = $isSysType;
            $defs[] = $def;
        }

        return $defs;
    }

    /**
     * @param array $definitionsArray
     * @return PredicateDefinition[]
     */
    public static function getPredicateDefinitionsFromArray(array $definitionsArray) : array {
        $defs = [];
        foreach($definitionsArray as $definitionObject) {
            $def = new PredicateDefinition();
            $def->id = $definitionObject['id'];
            $def->type = $definitionObject['type'];
            $def->name = $definitionObject['name'];
            $def->description = $definitionObject['descr'];
            $def->singleProperty = $definitionObject['singleProperty'] ?? false;
            $def->allowedSubjectTypes = $definitionObject['allowedSubjectTypes'] ?? null;
            $def->allowedObjectTypes = $definitionObject['allowedObjectTypes'] ?? null;
            $def->allowedQualifications = $definitionObject['allowedQualifications'] ?? null;
            $def->allowedValues = $definitionObject['allowedValues'] ?? null;
            $def->reversePredicate = $definitionObject['reversePredicate'] ?? null;
            $def->isPrimaryRelation = $definitionObject['isPrimaryRelation'] ?? true;
            $def->canBeCancelled = $definitionObject['canBeCancelled'] ?? true;
            $def->flags = $definitionObject['flags'] ?? null;
            $def->deprecated = $definitionObject['deprecated'] ?? false;
            $def->deprecationNotice = $definitionObject['deprecationNotice'] ?? '';
            $defs[] = $def;
        }

        return $defs;
    }
}