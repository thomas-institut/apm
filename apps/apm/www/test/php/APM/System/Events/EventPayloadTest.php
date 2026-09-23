<?php

namespace APM\System\Events;

use PHPUnit\Framework\TestCase;

/**
 * Test event payload construction and retained data fields.
 */
class EventPayloadTest extends TestCase
{

    /**
     * Test that transcription payload fields retain their named values.
     */
    public function testTranscriptionUpdatedPayload(): void
    {
        $payload = new TranscriptionUpdatedPayload(71, 82, 3, 4);

        $this->assertSame([71, 82, 3, 4], [$payload->userTid, $payload->docId, $payload->pageNumber, $payload->columnNumber]);
    }

    /**
     * Test that page settings payload fields retain their named values.
     */
    public function testPageSettingsUpdatedPayload(): void
    {
        $payload = new PageSettingsUpdatedPayload(71, 82);

        $this->assertSame([71, 82], [$payload->userTid, $payload->pageId]);
    }

    /**
     * Test that collation table payload fields retain their named values.
     */
    public function testCollationTableSavedPayload(): void
    {
        $payload = new CollationTableSavedPayload(71, 82);

        $this->assertSame([71, 82], [$payload->userTid, $payload->ctId]);
    }

    /**
     * Test that document payload fields retain their named values.
     */
    public function testDocumentChangedPayload(): void
    {
        $payload = new DocumentChangedPayload(71, 82);

        $this->assertSame([71, 82], [$payload->userTid, $payload->docId]);
    }

    /**
     * Test that entity payload retains either a single ID or an ordered ID array.
     */
    public function testEntityDataChangedPayload(): void
    {
        $singleEntityPayload = new EntityDataChangedPayload(71, 82);
        $entityIds = [71, 82];
        $multipleEntityPayload = new EntityDataChangedPayload($entityIds, 83);

        $this->assertSame(71, $singleEntityPayload->entityIdOrIds);
        $this->assertSame(82, $singleEntityPayload->userId);
        $this->assertSame($entityIds, $multipleEntityPayload->entityIdOrIds);
        $this->assertSame(83, $multipleEntityPayload->userId);
    }

    /**
     * Test that person payload retains its entity ID.
     */
    public function testPersonDataChangedPayload(): void
    {
        $payload = new PersonDataChangedPayload(71);

        $this->assertSame(71, $payload->personTid);
    }

    /**
     * Test that work payload retains its entity ID.
     */
    public function testWorkChangedPayload(): void
    {
        $payload = new WorkChangedPayload(71);

        $this->assertSame(71, $payload->workId);
    }
}