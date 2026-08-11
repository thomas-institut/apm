<?php

namespace APM\MultiChunkEdition;

use Exception;
use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\Exception\RowDoesNotExist;
use ThomasInstitut\DataTable\UnitemporalDataTable;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;
use ThomasInstitut\TimeString\TimeString;

class ApmMultiChunkEditionManager extends MultiChunkEditionManager implements LoggerAwareInterface
{
    use SimpleErrorReporterTrait;
    use LoggerAwareTrait;


    /**
     * @var UnitemporalDataTable
     */
    private UnitemporalDataTable $mceTable;


    public function __construct(UnitemporalDataTable $mceTable, LoggerInterface $logger)
    {
        $this->mceTable = $mceTable;
        $this->setLogger($logger);
    }

    public function getMultiChunkEditionsByUser(int $userId, bool $includeArchived = false): array
    {
        $ids = [];
        $rowsToFind = ['author_tid' => $userId];
        if (!$includeArchived) {
            $rowsToFind['archived'] = '0';
        }

        $rows = $this->mceTable->findRowsWithTime($rowsToFind, 0, TimeString::now());

        foreach($rows as $row) {
            $ids[] =  [
                'id' => intval($row['id']),
                'title' => $row['title']
            ];
        }
        return $ids;
    }

    /**
     * @inheritDoc
     */
    public function getMultiChunkEditionById(int $id, string $timeString = ''): MceSystemData
    {
        if ($timeString === '') {
            $timeString = TimeString::now();
        }
        $rows = $this->mceTable->findRowsWithTime([ 'id' => $id], 1, $timeString);

        if (count($rows) === 0) {
            throw new MultiChunkEditionDoesNotExist("Multi chunk edition with id $id does not exist");
        }
        $dbRow = $rows->getFirst();
        $isCompressed = intval($dbRow['compressed']) === 1;

        if ($isCompressed) {
            $dataJson = gzuncompress($dbRow['mce_data']);
        } else {
            $dataJson = $dbRow['mce_data'];
        }

        $mceData = json_decode($dataJson, true);

        // Handle archived editions
        $mceData['archived'] = intval($dbRow['archived']) === 1;

        $data = new MceSystemData();
        $data->chunks = explode(',', $dbRow['chunks']);
        $data->authorId = $dbRow['author_tid'];
        $data->versionDescription = $dbRow['version_description'];
        $data->validFrom = $dbRow['valid_from'];
        $data->validUntil = $dbRow['valid_until'];
        $data->mceData = $mceData;
        return $data;
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
            throw new InvalidArgumentException("Invalid author tid $authorId");
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
//    public function getMultiChunkEditionIdsByWorkChunk(string $workId, int $chunkId): array
//    {
//        // TODO: Implement getMultiChunkEditionIdsByWorkChunk() method.
//        return [];
//    }

    /**
     * @inheritDoc
     */
    public function getEditionVersions(int $mceId): array
    {
        try {
            $rows = $this->mceTable->getRowHistory($mceId);
            $outputArray = [];
            foreach ($rows as $row) {
                $info = new MceVersionInfo();
                $info->mceId = $mceId;
                $info->authorId = $row['author_tid'];
                $info->description = $row['version_description'];
                $info->timeString = $row['valid_from'];
                $outputArray[] = $info;
            }
            return $outputArray;
        } catch (RowDoesNotExist) {
            throw new MultiChunkEditionDoesNotExist("Edition $mceId does not exist");
        }
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
        $chunkDbString = implode(',', MceDataUtils::getChunkIds($mceData));

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
            'author_tid' => $authorId,
            'version_description' => $versionDescription,
            'chunks' => $chunkDbString,
            'compressed' => $compress ? 1 : 0,
            'archived' => $mceData['archived'] ? 1 : 0,
            'mce_data' => $dataToSave
        ];

    }
}