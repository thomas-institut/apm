<?php

namespace APM\System\Work;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
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
        $statements = $this->entitySystem->getStatements(null, Entity::pApmWorkId, $dareId);

        if (count($statements) === 0) {
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
            $data->tid = $workTid;
            $data->dareId =  $entityData->getObjectForPredicate(Entity::pApmWorkId) ?? '';
            $data->authorTid = $entityData->getObjectForPredicate(Entity::pWorkAuthor);
            $data->title =  $entityData->getObjectForPredicate(Entity::pEntityName);

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
}