<?php

namespace APM\System\Work;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\ValueToolBox;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use RuntimeException;

class EntitySystemWorkManager implements WorkManager
{

    use LoggerAwareTrait;

    private ApmEntitySystemInterface $entitySystem;

    public function __construct(ApmEntitySystemInterface $entitySystem) {
        $this->entitySystem = $entitySystem;
        $this->logger = new NullLogger();
    }

    /**
     * @inheritDoc
     */
    public function getWorkDataByDareId(string $dareId): WorkData
    {
//        $this->logger->debug("Getting work by dare Id $dareId");
        $statements = $this->entitySystem->getStatements(null, Entity::pApmWorkId, $dareId);

        if (count($statements) === 0) {
//            $this->logger->debug("No work data found for dare $dareId");
            throw new WorkNotFoundException("No work with given Dare Id $dareId");
        }

        return $this->getWorkData($statements[0]->subject);
    }

    /**
     * @inheritDoc
     */
    public function getWorkData(int $workTid): WorkData
    {

        try {
            $type = $this->entitySystem->getEntityType($workTid);
            if ($type !== Entity::tWork) {
                throw new WorkNotFoundException("Entity $workTid is not a work");
            }
            $entityData = $this->entitySystem->getEntityData($workTid);


            $data = new WorkData();
            $data->entityId = $workTid;
            $data->workId =  $entityData->getObjectForPredicate(Entity::pApmWorkId) ?? '';
            $data->authorId = $entityData->getObjectForPredicate(Entity::pWorkAuthor);
            $data->title =  $entityData->getObjectForPredicate(Entity::pEntityName);
            $data->shortTitle = $entityData->getObjectForPredicate(Entity::pWorkShortTitle) ?? '';
            $data->enabled = ValueToolBox::valueToBool($entityData->getObjectForPredicate(Entity::pWorkIsEnabledInApm))
                ?? false;


            return $data;

        } catch (EntityDoesNotExistException) {
            throw new WorkNotFoundException("Entity $workTid does not exist");
        }
    }

    /**
     * @inheritDoc
     */
    public function getWorksByAuthor(int $authorTid): array
    {
        $statements = $this->entitySystem->getStatements(null, Entity::pWorkAuthor, $authorTid);

        $dataArray = [];
        foreach ($statements as $statement) {
            try {
                $dataArray[] = $this->getWorkData($statement->subject);
            } catch (WorkNotFoundException) {
                throw new RuntimeException("Work $statement->subject not found, but it MUST be there");
            }
        }

        return $dataArray;
    }

    /**
     * @inheritDoc
     */
    public function getAuthors() :array
    {
        $authorStatements = $this->entitySystem->getStatements(null, Entity::pWorkAuthor, null);
        $authors = [];
        foreach ($authorStatements as $authorStatement) {
            $authors[] = $authorStatement->object;
        }

        return array_values(array_unique($authors, SORT_NUMERIC));
    }

    /**
     * @inheritDoc
     */
    public function getEnabledWorks(): array
    {
        $statements = $this->entitySystem->getStatements(null, Entity::pWorkIsEnabledInApm, ValueToolBox::boolToValue(true));

        $ids = [];
        foreach ($statements as $statement) {
            $ids[] = $statement->subject;
        }
        return $ids;
    }
}