<?php

namespace APM\System\EntitySystem;

/**
 * Entity ids for entity types
 */
class EntityType implements EntityTypeDefiner
{

    use TidDefinerTrait;

    //
    // Tids 10-99
    //
    const Relation = 11;
    const Attribute = 12;
    const EntityType = 13;
    const ValueType = 14;
    const Statement = 15;
    const StatementGroup = 16;
    const Person = 17;
    const Place = 18;
    const Area = 19;
    const Lang = 20;
    const Context = 21;
    const Material = 22;
    const Institution = 23;

    public static function getEntityTypeDefinition(int $tid): ?EntityTypeDefinition
    {
        $def = new EntityTypeDefinition();
        $def->tid = $tid;
        switch($tid) {
            case self::Relation:
            case self::Attribute:
            case self::EntityType:
            case self::Statement:
            case self::StatementGroup:
            case self::ValueType:
                $def->entityCreationAllowed = false;
                $def->entitiesCanBeQueried = false;
                return $def;

            case self::Person:
            case self::Place:
            case self::Area:
            case self::Lang:
            case self::Context:
            case self::Material:
            case self::Institution:
                $def->entityCreationAllowed = true;
                return $def;

            default:
                return null;
        }
    }
}