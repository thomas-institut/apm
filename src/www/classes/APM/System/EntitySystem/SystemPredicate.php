<?php

namespace APM\System\EntitySystem;

/**
 * Tids for predicates
 */
class SystemPredicate implements PredicateDefiner
{
    use TidDefinerTrait;
    //
    // Tids 201-999
    //
    const EntityType = 201;
    const EntityName = 202;
    const EntityDescription = 203;

    const EntityCreationTimestamp = 204;

    // Predicate flags
    const IsStatementMetadataPredicate = 301;
    const IsCancellationPredicate = 302;
    const IsMergePredicate = 303;


    // Statement Metadata predicates
    const StatementAuthor = 401;
    const StatementTimestamp = 402;
    const StatementEditorialNote = 403;


    // Statement Qualification Predicates
    const QualificationLang = 501;
    const QualificationSeq = 502;
    const QualificationFrom = 503;
    const QualificationUntil = 504;
    const QualificationContext = 505;

    // Cancellation Predicates
    const CancelledBy = 601;
    const CancellationTimestamp = 602;
    const CancellationEditorialNote = 603;

    // Merge Predicates
    const MergedInto = 701;
    const MergedBy = 702;
    const MergeTimestamp = 703;
    const MergeEditorialNote = 704;


    /**
     * @inheritDoc
     */
    public function getPredicateDefinition(int $tid): ?PredicateDefinition
    {
        $def = new PredicateDefinition();
        $def->tid = $tid;


        switch ($tid) {
            case self::EntityType:
                $def->type = EntityType::Relation;
                $def->allowedObjectTypes = [ EntityType::EntityType];
                $def->canBeCancelled = false;
                $def->singleProperty = true;
                break;

            case self::EntityName:
            case self::IsMergePredicate:
            case self::IsCancellationPredicate:
            case self::IsStatementMetadataPredicate:

                $def->type = EntityType::Attribute;
                $def->canBeCancelled = false;
                $def->singleProperty = true;
                break;


            case self::EntityDescription:
                $def->type = EntityType::Attribute;
                $def->canBeCancelled = true;
                $def->singleProperty = true;
                break;

            case self::EntityCreationTimestamp:
                $def->type = EntityType::Attribute;
                $def->allowedObjectTypes = [ ValueType::Timestamp];
                $def->canBeCancelled = false;
                $def->singleProperty = true;
                break;

            case self::StatementAuthor:
                $def->type = EntityType::Relation;
                $def->flags = [ self::IsStatementMetadataPredicate];
                $def->allowedObjectTypes = [ EntityType::Person];
                break;

            case self::StatementTimestamp:
                $def->type = EntityType::Attribute;
                $def->flags = [ self::IsStatementMetadataPredicate];
                $def->allowedObjectTypes = [ ValueType::Timestamp ];
                break;

            case self::StatementEditorialNote:
                $def->type = EntityType::Attribute;
                $def->flags = [ self::IsStatementMetadataPredicate];
                break;

            case self::QualificationLang:
                $def->type = EntityType::Relation;
                $def->flags = [ self::IsStatementMetadataPredicate];
                $def->allowedObjectTypes = [ EntityType::Lang];
                break;

            case self::QualificationContext:
                $def->type = EntityType::Relation;
                $def->flags = [ self::IsStatementMetadataPredicate];
                $def->allowedObjectTypes = [ EntityType::Context];
                break;

            case self::QualificationSeq:
                $def->type = EntityType::Attribute;
                $def->flags = [ self::IsStatementMetadataPredicate];
                $def->allowedObjectTypes = [ ValueType::Integer ];
                break;

            case self::QualificationFrom:
            case self::QualificationUntil:
                $def->type = EntityType::Attribute;
                $def->flags = [ self::IsStatementMetadataPredicate];
                $def->allowedObjectTypes = [ ValueType::VagueDate ];
                break;

            case self::CancelledBy:
                $def->type = EntityType::Relation;
                $def->flags = [ self::IsCancellationPredicate];
                $def->allowedObjectTypes = [ EntityType::Person];
                break;

            case self::CancellationTimestamp:
                $def->type = EntityType::Attribute;
                $def->flags = [ self::IsCancellationPredicate];
                $def->allowedObjectTypes = [ ValueType::Timestamp ];
                break;

            case self::CancellationEditorialNote:
                $def->type = EntityType::Attribute;
                $def->flags = [ self::IsCancellationPredicate];
                break;

            case self::MergedInto:
                $def->type = EntityType::Relation;
                $def->flags = [ self::IsMergePredicate];
                $def->canBeCancelled = false;
                $def->singleProperty = true;
                break;

            case self::MergedBy:
                $def->type = EntityType::Relation;
                $def->flags = [ self::IsMergePredicate];
                $def->allowedObjectTypes = [ EntityType::Person];
                $def->canBeCancelled = false;
                $def->singleProperty = true;
                break;

            case self::MergeTimestamp:
                $def->type = EntityType::Attribute;
                $def->flags = [ self::IsMergePredicate];
                $def->allowedObjectTypes = [ ValueType::Timestamp ];
                $def->canBeCancelled = false;
                $def->singleProperty = true;
                break;

            case self::MergeEditorialNote:
                $def->type = EntityType::Attribute;
                $def->flags = [ self::IsMergePredicate];
                $def->canBeCancelled = false;
                $def->singleProperty = true;
                break;


            default:
                return null;
        }

        return $def;
    }
}