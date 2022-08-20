<?php

namespace APM\MultiChunkEdition;

use Exception;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\UnitemporalDataTable;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;
use ThomasInstitut\TimeString\TimeString;

class ApmMultiChunkEditionManager extends MultiChunkEditionManager implements LoggerAwareInterface, SqlQueryCounterTrackerAware
{
    use SimpleErrorReporterTrait;
    use LoggerAwareTrait;
    use SimpleSqlQueryCounterTrackerAware;


    /**
     * @var UnitemporalDataTable
     */
    private UnitemporalDataTable $mceTable;


    public function __construct(UnitemporalDataTable $mceTable, LoggerInterface $logger)
    {
        $this->mceTable = $mceTable;
        $this->setLogger($logger);
    }


    /**
     * @inheritDoc
     * @throws MultiChunkEditionDoesNotExist
     */
    public function getMultiChunkEditionById(int $id, string $timeString = ''): array
    {
        if ($timeString === '') {
            $timeString = TimeString::now();
        }
        $rows = $this->mceTable->findRowsWithTime([ 'id' => $id], 1, $timeString);

        if (count($rows) === 0) {
            throw new MultiChunkEditionDoesNotExist("Multi chunk edition with id $id does not exist");
        }

        $dbData = $rows[0];
        $isCompressed = $dbData['compressed'] === '1';

        if ($isCompressed) {
            $dataJson = gzuncompress($dbData['data']);
        } else {
            $dataJson = $dbData['data'];
        }

        $mceData = json_decode($dataJson, true);

        // Handle archived editions
        $mceData['archived'] = $dbData['archived'] === '1';

        return [
            'authorId' => $dbData['author_id'],
            'chunks' => explode(',', $dbData['chunks']),
            'versionDescription' => $dbData['version_description'],
            'validFrom' => $dbData['valid_from'],
            'validUntil' => $dbData['valid_until'],
            'mceData' => $mceData
        ];
    }

    /**
     * @inheritDoc
     * @throws MultiChunkEditionDoesNotExist
     * @throws Exception
     */
    public function saveMultiChunkEdition(int $id, array $mceData, int $authorId, string $versionDescription): int
    {
        $timeString = TimeString::now();
        if ($authorId <= 0){
            throw new InvalidArgumentException("Invalid author id $authorId");
        }
        $isNew = $id === -1;
        if (!$isNew) {
            // get the edition so that an exception is thrown if it does not exist
            $this->getMultiChunkEditionById($id);
        }
        $dbRow = $this->getDbRowFromMceData($mceData, $authorId, $versionDescription);
        if ($isNew) {
            $id = $this->mceTable->createRowWithTime($dbRow, $timeString);
        } else {
            $dbRow['id'] = $id;
            $this->mceTable->updateRowWithTime($dbRow, $timeString);
        }
        return $id;
    }

    /**
     * @inheritDoc
     */
    public function getMultiChunkEditionIdsByWorkChunk(string $workId, int $chunkId): array
    {
        // TODO: Implement getMultiChunkEditionIdsByWorkChunk() method.
        return [];
    }

    /**
     * @param array $mceData
     * @param int $authorId
     * @param string $versionDescription
     * @param bool $compress
     * @return array
     * @throws Exception
     */
    private function getDbRowFromMceData(array $mceData, int $authorId, string $versionDescription, bool $compress = false): array
    {

        if (!isset($mceData['chunks'])) {
            throw new InvalidArgumentException("No chunk information in MceData");
        }
        $chunkDbString = implode(',', MceData::getChunkIds($mceData));

        if (!isset($mceData['title']) || $mceData['title'] === '') {
            $mceData['title'] = 'Edition ' . random_int(1000000, 9999999);
        }

        $title =  $mceData['title'];

        $dataToSave = json_encode($mceData);
        if ($compress) {
            $dataToSave = gzcompress($dataToSave);
        }

        return [
            'title' => $title,
            'author_id' => $authorId,
            'version_description' => $versionDescription,
            'chunks' => $chunkDbString,
            'compressed' => $compress ? 1 : 0,
            'archived' => $mceData['archived'] ? 1 : 0,
            'mce_data' => $dataToSave
        ];

    }
}