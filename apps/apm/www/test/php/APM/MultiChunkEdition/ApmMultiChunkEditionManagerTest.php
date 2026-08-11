<?php

namespace APM\MultiChunkEdition;

use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\Exception\RowDoesNotExist;
use ThomasInstitut\DataTable\ResultsIterator\ResultsIterator;
use ThomasInstitut\DataTable\UnitemporalDataTable;

/**
 * Unit tests for ApmMultiChunkEditionManager.
 */
class ApmMultiChunkEditionManagerTest extends TestCase
{
    private UnitemporalDataTable $table;
    private ApmMultiChunkEditionManager $manager;

    /**
     * Creates a manager with a mocked data table for each test.
     */
    protected function setUp(): void
    {
        $this->table = $this->createMock(UnitemporalDataTable::class);
        $this->manager = new ApmMultiChunkEditionManager(
            $this->table,
            $this->createStub(LoggerInterface::class)
        );
    }

    /**
     * Verifies that archived editions are excluded unless requested.
     */
    public function testGetMultiChunkEditionsByUserExcludesArchivedEditionsByDefault(): void
    {
        $rows = [
            ['id' => '12', 'title' => 'First edition'],
            ['id' => 13, 'title' => 'Second edition'],
        ];
        $results = $this->resultsIterator($rows);

        $this->table->expects($this->once())
            ->method('findRowsWithTime')
            ->with(
                ['author_tid' => 7, 'archived' => '0'],
                0,
                $this->isString()
            )
            ->willReturn($results);

        self::assertSame(
            [
                ['id' => 12, 'title' => 'First edition'],
                ['id' => 13, 'title' => 'Second edition'],
            ],
            $this->manager->getMultiChunkEditionsByUser(7)
        );
    }

    /**
     * Verifies that archived editions can be included in the user listing.
     */
    public function testGetMultiChunkEditionsByUserCanIncludeArchivedEditions(): void
    {
        $results = $this->resultsIterator([
            ['id' => '12', 'title' => 'Archived edition'],
        ]);

        $this->table->expects($this->once())
            ->method('findRowsWithTime')
            ->with(['author_tid' => 7], 0, $this->isString())
            ->willReturn($results);

        self::assertSame(
            [['id' => 12, 'title' => 'Archived edition']],
            $this->manager->getMultiChunkEditionsByUser(7, true)
        );
    }

    /**
     * Verifies retrieval and archive flag conversion for uncompressed data.
     */
    public function testGetMultiChunkEditionByIdReturnsUncompressedDataAndArchiveStatus(): void
    {
        $row = [
            'id' => 12,
            'author_tid' => 7,
            'version_description' => 'Initial version',
            'chunks' => '101,102',
            'compressed' => '0',
            'archived' => '1',
            'mce_data' => json_encode([
                'title' => 'An edition',
                'chunks' => [
                    ['chunkId' => 101],
                    ['chunkId' => 102],
                ],
            ]),
            'valid_from' => '2026-01-01 00:00:00.000000',
            'valid_until' => '9999-12-31 23:59:59.999999',
        ];
        $results = $this->resultsIterator([$row]);

        $this->table->expects($this->once())
            ->method('findRowsWithTime')
            ->with(['id' => 12], 1, '2026-02-01 00:00:00.000000')
            ->willReturn($results);

        $data = $this->manager->getMultiChunkEditionById(12, '2026-02-01 00:00:00.000000');

        self::assertSame(7, $data->authorId);
        self::assertSame(['101', '102'], $data->chunks);
        self::assertSame('Initial version', $data->versionDescription);
        self::assertSame($row['valid_from'], $data->validFrom);
        self::assertSame($row['valid_until'], $data->validUntil);
        self::assertTrue($data->mceData['archived']);
        self::assertSame('An edition', $data->mceData['title']);
    }

    /**
     * Verifies that compressed edition data is decompressed before decoding.
     */
    public function testGetMultiChunkEditionByIdReadsCompressedData(): void
    {
        $mceData = [
            'title' => 'Compressed edition',
            'chunks' => [['chunkId' => 101]],
        ];
        $row = [
            'author_tid' => 7,
            'version_description' => 'Compressed version',
            'chunks' => '101',
            'compressed' => 1,
            'archived' => 0,
            'mce_data' => gzcompress(json_encode($mceData)),
            'valid_from' => '2026-01-01 00:00:00.000000',
            'valid_until' => '9999-12-31 23:59:59.999999',
        ];

        $this->table->expects($this->once())
            ->method('findRowsWithTime')
            ->willReturn($this->resultsIterator([$row]));

        $data = $this->manager->getMultiChunkEditionById(12);

        self::assertSame($mceData, array_diff_key($data->mceData, ['archived' => true]));
        self::assertFalse($data->mceData['archived']);
    }

    /**
     * Verifies that missing editions produce the domain exception.
     */
    public function testGetMultiChunkEditionByIdThrowsWhenEditionDoesNotExist(): void
    {
        $this->table->expects($this->once())
            ->method('findRowsWithTime')
            ->willReturn($this->resultsIterator([]));

        $this->expectException(MultiChunkEditionDoesNotExist::class);
        $this->manager->getMultiChunkEditionById(404, '2026-02-01 00:00:00.000000');
    }

    /**
     * Verifies creation of a new edition row from MCE data.
     */
    public function testSaveMultiChunkEditionCreatesRowWithSerializedData(): void
    {
        $mceData = [
            'title' => 'New edition',
            'archived' => true,
            'chunks' => [
                ['chunkId' => 101],
                ['chunkId' => 102],
            ],
        ];

        $this->table->expects($this->once())
            ->method('createRowWithTime')
            ->with(
                [
                    'title' => 'New edition',
                    'author_tid' => 7,
                    'version_description' => 'Created',
                    'chunks' => '101,102',
                    'compressed' => 0,
                    'archived' => 1,
                    'mce_data' => json_encode($mceData),
                ],
                $this->isString()
            )
            ->willReturn(12);

        self::assertSame(12, $this->manager->saveMultiChunkEdition(-1, $mceData, 7, 'Created'));
    }

    /**
     * Verifies that an existing edition is validated and updated.
     */
    public function testSaveMultiChunkEditionUpdatesExistingRow(): void
    {
        $existingRow = [
            'author_tid' => 7,
            'version_description' => 'Old',
            'chunks' => '101',
            'compressed' => 0,
            'archived' => 0,
            'mce_data' => json_encode(['title' => 'Old', 'chunks' => [['chunkId' => 101]]]),
            'valid_from' => '2026-01-01 00:00:00.000000',
            'valid_until' => '9999-12-31 23:59:59.999999',
        ];
        $mceData = [
            'title' => 'Updated edition',
            'archived' => false,
            'chunks' => [['chunkId' => 102]],
        ];

        $this->table->expects($this->once())
            ->method('findRowsWithTime')
            ->with(['id' => 12], 1, $this->isString())
            ->willReturn($this->resultsIterator([$existingRow]));
        $this->table->expects($this->once())
            ->method('updateRowWithTime')
            ->with(
                [
                    'id' => 12,
                    'title' => 'Updated edition',
                    'author_tid' => 8,
                    'version_description' => 'Updated',
                    'chunks' => '102',
                    'compressed' => 0,
                    'archived' => 0,
                    'mce_data' => json_encode($mceData),
                ],
                $this->isString()
            );

        self::assertSame(12, $this->manager->saveMultiChunkEdition(12, $mceData, 8, 'Updated'));
    }

    /**
     * Verifies that invalid author IDs are rejected before persistence.
     */
    public function testSaveMultiChunkEditionRejectsNonPositiveAuthorId(): void
    {
        $this->table->expects($this->never())->method('createRowWithTime');
        $this->table->expects($this->never())->method('updateRowWithTime');

        $this->expectException(\InvalidArgumentException::class);
        $this->manager->saveMultiChunkEdition(-1, ['chunks' => [], 'archived' => false], 0, 'Invalid');
    }

    /**
     * Verifies conversion of row history to version information objects.
     */
    public function testGetEditionVersionsReturnsVersionInfoObjects(): void
    {
        $this->table->expects($this->once())
            ->method('getRowHistory')
            ->with(12)
            ->willReturn([
                [
                    'author_tid' => 7,
                    'version_description' => 'Initial',
                    'valid_from' => '2026-01-01 00:00:00.000000',
                ],
                [
                    'author_tid' => 8,
                    'version_description' => 'Updated',
                    'valid_from' => '2026-02-01 00:00:00.000000',
                ],
            ]);

        $versions = $this->manager->getEditionVersions(12);

        self::assertCount(2, $versions);
        self::assertContainsOnlyInstancesOf(MceVersionInfo::class, $versions);
        self::assertSame(12, $versions[0]->mceId);
        self::assertSame(7, $versions[0]->authorId);
        self::assertSame('Initial', $versions[0]->description);
        self::assertSame('2026-01-01 00:00:00.000000', $versions[0]->timeString);
        self::assertSame(8, $versions[1]->authorId);
    }

    /**
     * Verifies conversion of a missing history row to the domain exception.
     */
    public function testGetEditionVersionsConvertsMissingRowException(): void
    {
        $this->table->expects($this->once())
            ->method('getRowHistory')
            ->with(404)
            ->willThrowException(new RowDoesNotExist());

        $this->expectException(MultiChunkEditionDoesNotExist::class);
        $this->manager->getEditionVersions(404);
    }

    /**
     * Creates an iterator stub for rows returned by the data table.
     */
    private function resultsIterator(array $rows): ResultsIterator
    {
        $iterator = $this->createStub(ResultsIterator::class);
        $position = 0;

        $iterator->method('count')->willReturn(count($rows));
        $iterator->method('getFirst')->willReturn($rows[0] ?? null);
        $iterator->method('rewind')->willReturnCallback(function () use (&$position): void {
            $position = 0;
        });
        $iterator->method('current')->willReturnCallback(function () use (&$position, $rows): ?array {
            return $rows[$position] ?? null;
        });
        $iterator->method('key')->willReturnCallback(function () use (&$position): int {
            return $position;
        });
        $iterator->method('valid')->willReturnCallback(function () use (&$position, $rows): bool {
            return $position < count($rows);
        });
        $iterator->method('next')->willReturnCallback(function () use (&$position): void {
            $position++;
        });

        return $iterator;
    }
}