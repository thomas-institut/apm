<?php

namespace APM\System\Work;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidEntityTypeException;
use APM\EntitySystem\Exception\InvalidObjectException;
use APM\EntitySystem\Exception\InvalidStatementException;
use APM\EntitySystem\Exception\InvalidSubjectException;
use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\ValueToolBox;
use InvalidArgumentException;
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

    public function createWork(string $workTitle, string $shortTitle, int $workAuthor, string $dareId, bool $enabled, int $creator): int
    {
        $workTitle = trim($workTitle);

        if (!$this->entitySystem->validateEntity($workAuthor, Entity::tPerson)) {
            throw new InvalidArgumentException("Author entity $workAuthor does not exist or is not a Person");
        }

        if ($creator !== Entity::System) {
            if (!$this->entitySystem->validateEntity($creator, Entity::tPerson)) {
                throw new InvalidArgumentException("Creator entity $creator does not exist or is not a Person");
            }
        }

        $dareId = trim($dareId);
        $workTitle = trim($workTitle);
        $shortTitle = trim($shortTitle);

        if ($dareId === '' || $workTitle === '' || $shortTitle === '') {
            throw new InvalidArgumentException("Empty dareId, title or short title");
        }

        if (!self::isValidDareId($dareId)) {
            throw new InvalidArgumentException("Dare id $dareId is not valid");
        }

        // All good, create the entity
        try {
            $workId = $this->entitySystem->createEntity(
                Entity::tWork,
                $workTitle,
                '',
                $creator
            );
        } catch (InvalidEntityTypeException $e) {
            // should never happen!
            throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
        }

        // Now let's add some statements
        try {
            $this->entitySystem->makeStatement(
                $workId,
                Entity::pWorkAuthor,
                $workAuthor,
                $creator,
                'Setting work author'
            );
            $this->entitySystem->makeStatement(
                $workId,
                Entity::pWorkShortTitle,
                $shortTitle,
                $creator,
                'Setting short title'
            );
            $this->entitySystem->makeStatement(
                $workId,
                Entity::pApmWorkId,
                $dareId,
                $creator,
                'Setting work id'
            );
            $this->entitySystem->makeStatement(
                $workId,
                Entity::pWorkIsEnabledInApm,
                ValueToolBox::boolToValue($enabled),
                $creator,
                'Setting enabled flag'
            );
        } catch (InvalidObjectException|InvalidSubjectException|InvalidStatementException $e) {
            // should never happen!
            throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
        }

        return $workId;

    }

    public static function isValidDareId(string $dareId) : bool {

        return preg_match('/^[A-Z]+\d+$/', $dareId) !== false;
    }

    public function setWorkEnableStatus(int $workId, bool $enabled): void
    {
        if (!$this->entitySystem->validateEntity($workId, Entity::tWork)) {
            throw new WorkNotFoundException("Work $workId does not exist or entity is not a work");
        }
        try {
            $this->entitySystem->makeStatement(
                $workId,
                Entity::pWorkIsEnabledInApm,
                ValueToolBox::boolToValue($enabled),
                Entity::System,
                'Setting enabled flag'
            );
        } catch (InvalidObjectException|InvalidSubjectException|InvalidStatementException $e) {
            // should never happen!
            throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
        }
    }
}