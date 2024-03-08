<?php

namespace APM\System\EntitySystem;

class GeoPredicate implements PredicateDefiner
{
    use TidDefinerTrait;

    //
    // Tids 2001-2999
    //
    const InsideOf = 2001;  // e.g. ThomasInstitutBuilding (place) isIn Cologne (area)
    const Contains = 2002;
    const Address = 2003;
    const Gps = 2004;

    public function getPredicateDefinition(int $tid): ?PredicateDefinition
    {

        $def = new PredicateDefinition();
        $def->tid = $tid;

        switch($tid) {
            case self::InsideOf:
                $def->type = EntityType::Relation;
                $def->allowedObjectTypes = [ EntityType::Area];
                $def->reversePredicate = self::Contains;
                $def->isPrimaryRelation = false;
                break;

            case self::Contains:
                $def->type = EntityType::Relation;
                $def->allowedObjectTypes = [ EntityType::Area, EntityType::Place];
                $def->reversePredicate = self::InsideOf;
                $def->isPrimaryRelation = true;
                break;

            case self::Address:
                $def->type = EntityType::Attribute;
                break;

            case self::Gps:
                $def->type = EntityType::Attribute;
                $def->allowedObjectTypes = [ ValueType::GpsCoordinates];
                break;


            default:
                return null;
        }
        return $def;
    }
}