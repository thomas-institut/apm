<?php

namespace APM\System\EntitySystem;

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


    /**
     * @inheritDoc
     */
    public function getPredicateDefinition(int $tid): ?PredicateDefinition
    {
        $def = new PredicateDefinition();
        $def->tid = $tid;

        switch ($tid) {
            case self::AltName:
            case self::NameInOriginalScript:
            case self::SortName:
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
                break;

            default:
                return null;
        }

        return $def;
    }
}