<?php

namespace APM\System\EntitySystem;

use FastRoute\RouteParser;

class PersonPredicate implements PredicateDefiner
{
    use TidDefinerTrait;

    // Tids 1001-2000
    const SortName = 1001;
    const AltName = 1002;
    const NameInOriginalScript = 1003;

    const ExternalId = 1004;
    const Url = 1005;
    const EmailAddress = 1006;
    const MemberOf = 1007;
    const Occupation = 1008;

    const DateOfBirth = 1009;
    const DateOfDeath = 1010;

    const FatherOf = 1011;
    const HasFather = 1012;

    const MotherOf = 1011;
    const HasMother = 1013;


    /**
     * @inheritDoc
     */
    public function getPredicateDefinition(int $tid): ?PredicateDefinition
    {
        $def = new PredicateDefinition();
        $def->tid = $tid;

        switch ($tid) {

            case self::SortName:
            case self::NameInOriginalScript:
                $def->type = EntityType::Attribute;
                $def->singleProperty = true;
                break;

            case self::AltName:
            case self::ExternalId:
            case self::Occupation:
                $def->type = EntityType::Attribute;
                break;

            case self::Url:
                $def->type = EntityType::Attribute;
                $def->allowedObjectTypes = [ ValueType::Url];
                break;

            case self::EmailAddress:
                $def->type = EntityType::Attribute;
                $def->allowedObjectTypes = [ ValueType::EmailAddress];
                break;

            case self::MemberOf:
                $def->type = EntityType::Relation;
                break;

            case self::DateOfBirth:
            case self::DateOfDeath:
                $def->type = EntityType::Attribute;
                $def->allowedObjectTypes = [ ValueType::VagueDate];
                $def->singleProperty = true;
                break;

            case self::FatherOf:
                $def->type = EntityType::Relation;
                $def->allowedObjectTypes = [ EntityType::Person];
                $def->reversePredicate = self::HasFather;
                $def->isPrimaryRelation = true;
                break;

            case self::HasFather:
                $def->type = EntityType::Relation;
                $def->allowedObjectTypes = [ EntityType::Person];
                $def->reversePredicate = self::FatherOf;
                $def->isPrimaryRelation = false;
                break;

            case self::MotherOf:
                $def->type = EntityType::Relation;
                $def->allowedObjectTypes = [ EntityType::Person];
                $def->reversePredicate = self::HasMother;
                $def->isPrimaryRelation = true;
                break;

            case self::HasMother:
                $def->type = EntityType::Relation;
                $def->allowedObjectTypes = [ EntityType::Person];
                $def->reversePredicate = self::MotherOf;
                $def->isPrimaryRelation = false;
                break;

            default:
                return null;
        }

        return $def;
    }
}