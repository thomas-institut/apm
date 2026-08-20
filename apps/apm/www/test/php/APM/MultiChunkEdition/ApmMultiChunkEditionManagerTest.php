<?php

namespace APM\MultiChunkEdition;

use APM\System\DataTableSchema\MceDataTableSchemaProvider;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use ThomasInstitut\DataTable\Exception\InvalidColumnDefinitionsArray;
use ThomasInstitut\DataTable\Exception\InvalidRow;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;
use ThomasInstitut\DataTable\Exception\RowAlreadyExists;
use ThomasInstitut\DataTable\InMemoryUnitemporalDataTableWithSchema;
use ThomasInstitut\DataTable\UnitemporalDataTableWithSchema;
use ThomasInstitut\TimeString\TimeString;

class ApmMultiChunkEditionManagerTest extends TestCase
{
    private UnitemporalDataTableWithSchema $mceTable;
    private ApmMultiChunkEditionManager $manager;

    /**
     * @throws InvalidColumnDefinitionsArray
     */
    protected function setUp(): void
    {
        $this->mceTable = new InMemoryUnitemporalDataTableWithSchema(MceDataTableSchemaProvider::getSchema());
        $this->manager = new ApmMultiChunkEditionManager($this->mceTable, new NullLogger());
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     */
    public function testGetMultiChunkEditionsByUserExcludesArchivedEditionsByDefault(): void
    {
        $firstId = $this->saveEdition('First edition', 7);
        $this->saveEdition('Archived edition', 7, true);
        $this->saveEdition('Other author', 8);

        $this->assertSame(
            [['id' => $firstId, 'title' => 'First edition']],
            $this->manager->getMultiChunkEditionsByUser(7)
        );
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     */
    public function testGetMultiChunkEditionsByUserCanIncludeArchivedEditions(): void
    {
        $firstId = $this->saveEdition('First edition', 7);
        $archivedId = $this->saveEdition('Archived edition', 7, true);

        $this->assertSame(
            [
                ['id' => $firstId, 'title' => 'First edition'],
                ['id' => $archivedId, 'title' => 'Archived edition'],
            ],
            $this->manager->getMultiChunkEditionsByUser(7, true)
        );
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     */
    public function testGetMultiChunkEditionByIdReturnsEditionDataAndArchiveStatus(): void
    {
        $id = $this->saveEdition('Stored edition', 19, true, 'Second version', [12, 34]);

        $result = $this->manager->getMultiChunkEditionById($id);

        $this->assertSame(['12', '34'], $result->chunks);
        $this->assertSame(19, $result->authorId);
        $this->assertSame('Second version', $result->versionDescription);
        $this->assertSame(
            [
                'title' => 'Stored edition',
                'chunks' => [['chunkId' => 12], ['chunkId' => 34]],
                'archived' => true,
            ],
            $result->mceData
        );
        $this->assertNotSame('', $result->validFrom);
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     * @throws InvalidTimeStringException
     * @throws RowAlreadyExists
     * @throws InvalidRow
     */
    public function testGetMultiChunkEditionByIdUncompressesCompressedData(): void
    {
        $storedData = ['title' => 'Compressed edition', 'chunks' => [['chunkId' => 56]]];
        $id = $this->mceTable->createRowWithTime([
            'title' => 'Compressed edition',
            'author_tid' => 23,
            'version_description' => 'Compressed version',
            'chunks' => '56',
            'compressed' => true,
            'archived' => false,
            'mce_data' => gzcompress(json_encode($storedData)),
        ], TimeString::now());

        $result = $this->manager->getMultiChunkEditionById($id);

        $this->assertSame($storedData + ['archived' => false], $result->mceData);
    }

    public function testGetMultiChunkEditionByIdThrowsForMissingEdition(): void
    {
        $this->expectException(MultiChunkEditionDoesNotExist::class);

        $this->manager->getMultiChunkEditionById(999);
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     */
    public function testGetMultiChunkEditionByIdRejectsInvalidTimeString(): void
    {
        $id = $this->saveEdition('Edition', 1);

        $this->expectException(InvalidArgumentException::class);

        $this->manager->getMultiChunkEditionById($id, 'not a time string');
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     */
    public function testSaveMultiChunkEditionCreatesAndUpdatesAnEdition(): void
    {
        $id = $this->manager->saveMultiChunkEdition(
            -1,
            ['title' => 'New edition', 'chunks' => [['chunkId' => 21]]],
            31,
            'Initial version'
        );

        $this->assertSame(
            ['title' => 'New edition', 'chunks' => [['chunkId' => 21]], 'archived' => false],
            $this->manager->getMultiChunkEditionById($id)->mceData
        );

        $this->manager->saveMultiChunkEdition(
            $id,
            ['title' => 'Updated edition', 'chunks' => [['chunkId' => 22]], 'archived' => true],
            32,
            'Updated version'
        );

        $result = $this->manager->getMultiChunkEditionById($id);
        $this->assertSame(32, $result->authorId);
        $this->assertSame('Updated version', $result->versionDescription);
        $this->assertSame(
            ['title' => 'Updated edition', 'chunks' => [['chunkId' => 22]], 'archived' => true],
            $result->mceData
        );
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     */
    public function testSaveMultiChunkEditionRejectsInvalidAuthor(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->manager->saveMultiChunkEdition(-1, ['chunks' => [['chunkId' => 1]]], 0, 'Version');
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     */
    public function testSaveMultiChunkEditionRejectsMissingChunks(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->manager->saveMultiChunkEdition(-1, ['title' => 'No chunks'], 1, 'Version');
    }

    /**
     * @throws MultiChunkEditionDoesNotExist
     */
    public function testGetEditionVersionsReturnsAllVersionsInAscendingOrder(): void
    {
        $id = $this->saveEdition('Edition', 1, false, 'First version');
        $this->manager->saveMultiChunkEdition(
            $id,
            ['title' => 'Updated edition', 'chunks' => [['chunkId' => 2]]],
            2,
            'Second version'
        );

        $versions = $this->manager->getEditionVersions($id);

        $this->assertCount(2, $versions);
        $this->assertSame($id, $versions[0]->mceId);
        $this->assertSame(1, $versions[0]->authorId);
        $this->assertSame('First version', $versions[0]->description);
        $this->assertSame($id, $versions[1]->mceId);
        $this->assertSame(2, $versions[1]->authorId);
        $this->assertSame('Second version', $versions[1]->description);
        $this->assertLessThan($versions[1]->timeString, $versions[0]->timeString);
    }

    public function testGetEditionVersionsThrowsForMissingEdition(): void
    {
        $this->expectException(MultiChunkEditionDoesNotExist::class);

        $this->manager->getEditionVersions(999);
    }

    /**
     * @param array<int> $chunkIds
     * @throws MultiChunkEditionDoesNotExist
     */
    private function saveEdition(
        string $title,
        int $authorId,
        bool $archived = false,
        string $versionDescription = 'Version',
        array $chunkIds = [1]
    ): int {
        return $this->manager->saveMultiChunkEdition(
            -1,
            [
                'title' => $title,
                'chunks' => array_map(
                    static fn (int $chunkId): array => ['chunkId' => $chunkId],
                    $chunkIds
                ),
                'archived' => $archived,
            ],
            $authorId,
            $versionDescription
        );
    }
}