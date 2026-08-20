<?php

namespace APM\MultiChunkEdition;

use Exception;
use InvalidArgumentException;
use LogicException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataTable\Exception\InvalidRow;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;
use ThomasInstitut\DataTable\Exception\RowDoesNotExist;
use ThomasInstitut\DataTable\UnitemporalDataTableWithSchema;
use ThomasInstitut\TimeString\TimeString;

class ApmMultiChunkEditionManager implements MultiChunkEditionManager, LoggerAwareInterface
{
    use LoggerAwareTrait;

    public function __construct(private readonly UnitemporalDataTableWithSchema $mceTable, LoggerInterface $logger)
    {
        $this->setLogger($logger);
    }

    public function getMultiChunkEditionsByUser(int $userId, bool $includeArchived = false): array
    {
        $ids = [];
        $rowsToFind = ['author_tid' => $userId];
        if (!$includeArchived) {
            $rowsToFind['archived'] = false;
        }

        try {
            $rows = $this->mceTable->findRowsWithTime($rowsToFind, 0, TimeString::now());
        } catch (InvalidRow $e) {
            // this means a programming error
            throw new LogicException("Invalid row exception: " . $e->getMessage(), $e->getCode(), $e); // @codeCoverageIgnore
        } catch (InvalidTimeStringException $e) {
            // should never happen
            throw  new RuntimeException("Unexpected error: " . $e->getMessage(), $e->getCode(), $e); // @codeCoverageIgnore
        }

        foreach($rows as $row) {
            $ids[] =  [
                'id' => $row['id'],
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
        try {
            $row = $this->mceTable->getRowWithTime($id, $timeString);
        } catch (InvalidTimeStringException $e) {
            throw new InvalidArgumentException("Invalid time string: " . $e->getMessage(), $e->getCode(), $e);
        }

        if ($row === null) {
            throw new MultiChunkEditionDoesNotExist("Multi chunk edition with id $id does not exist");
        }
        $isCompressed = $row['compressed'];

        if ($isCompressed) {
            $dataJson = gzuncompress($row['mce_data']);
        } else {
            $dataJson = $row['mce_data'];
        }

        $mceData = json_decode($dataJson, true);

        // Handle archived editions
        $mceData['archived'] = $row['archived'];

        $data = new MceSystemData();
        $data->chunks = explode(',', $row['chunks']);
        $data->authorId = $row['author_tid'];
        $data->versionDescription = $row['version_description'];
        $data->validFrom = $row['valid_from'];
        $data->validUntil = $row['valid_until'];
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
            'compressed' => $compress,
            'archived' => $mceData['archived'] ?? false,
            'mce_data' => $dataToSave
        ];
    }
}