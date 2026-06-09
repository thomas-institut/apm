<?php

namespace APM\Api\Action;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Document\PageInfo;
use APM\System\Transcription\TranscriptionManager;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

class UpdatePageSettingsBulkActionTest extends TestCase
{
    /**
     * Create an entity system stub with valid languages configured.
     */
    private function createEntitySystemStub(): ApmEntitySystemInterface
    {
        $stub = $this->createStub(ApmEntitySystemInterface::class);
        $stub->method('getAllEntitiesForType')->willReturn([100, 200, 300]);
        return $stub;
    }

    /**
     * Create an action with the given transcription manager (mock or stub).
     */
    private function createAction(TranscriptionManager $transcriptionManager): UpdatePageSettingsBulkAction
    {
        return new UpdatePageSettingsBulkAction(
            $transcriptionManager,
            $this->createEntitySystemStub(),
            new NullLogger()
        );
    }

    /**
     * Test that a valid page definition updates the page and returns its ID.
     */
    public function testExecuteUpdatesPageSuccessfully(): void
    {
        $pageInfo = new PageInfo();
        $pageInfo->pageId = 10;
        $pageInfo->numCols = 1;

        $tm = $this->createMock(TranscriptionManager::class);
        $tm->method('getPageInfoByDocPage')->willReturn($pageInfo);
        $tm->expects($this->once())->method('updatePageSettings');

        $action = $this->createAction($tm);

        $pageDef = PageUpdateDefinition::fromArray([
            'docId' => 1,
            'page' => 1,
            'type' => 5,
        ]);

        $result = $action->execute([$pageDef], 999);

        $this->assertEmpty($result->errors);
        $this->assertSame([10], $result->updatedPageIds);
    }

    /**
     * Test that a missing docId and page produces an error.
     */
    public function testExecuteErrorsOnMissingDocIdAndPage(): void
    {
        $tm = $this->createStub(TranscriptionManager::class);
        $action = $this->createAction($tm);

        $pageDef = PageUpdateDefinition::fromArray([]);

        $result = $action->execute([$pageDef], 999);

        $this->assertCount(1, $result->errors);
        $this->assertStringContainsString('No docId or page', $result->errors[0]);
        $this->assertEmpty($result->updatedPageIds);
    }

    /**
     * Test that a non-existent page produces an error.
     */
    public function testExecuteErrorsOnPageNotFound(): void
    {
        $tm = $this->createStub(TranscriptionManager::class);
        $tm->method('getPageInfoByDocPage')
            ->willThrowException(new PageNotFoundException());

        $action = $this->createAction($tm);

        $pageDef = PageUpdateDefinition::fromArray([
            'docId' => 1,
            'page' => 99,
        ]);

        $result = $action->execute([$pageDef], 999);

        $this->assertCount(1, $result->errors);
        $this->assertStringContainsString('Page not found', $result->errors[0]);
        $this->assertEmpty($result->updatedPageIds);
    }

    /**
     * Test that foliation without overwriteFoliation produces an error.
     */
    public function testExecuteErrorsOnFoliationWithoutOverwrite(): void
    {
        $pageInfo = new PageInfo();
        $pageInfo->pageId = 10;
        $pageInfo->numCols = 1;

        $tm = $this->createStub(TranscriptionManager::class);
        $tm->method('getPageInfoByDocPage')->willReturn($pageInfo);

        $action = $this->createAction($tm);

        $pageDef = PageUpdateDefinition::fromArray([
            'docId' => 1,
            'page' => 1,
            'foliation' => '5r',
        ]);

        $result = $action->execute([$pageDef], 999);

        $this->assertCount(1, $result->errors);
        $this->assertStringContainsString('overwriteFoliation', $result->errors[0]);
    }

    /**
     * Test that columns are only increased, never decreased.
     */
    public function testExecuteDoesNotDecreaseColumns(): void
    {
        $pageInfo = new PageInfo();
        $pageInfo->pageId = 10;
        $pageInfo->numCols = 3;

        $tm = $this->createMock(TranscriptionManager::class);
        $tm->method('getPageInfoByDocPage')->willReturn($pageInfo);
        $tm->expects($this->once())
            ->method('updatePageSettings')
            ->with(
                10,
                $this->callback(fn(PageInfo $p) => $p->numCols === 3),
                999
            );

        $action = $this->createAction($tm);

        $pageDef = PageUpdateDefinition::fromArray([
            'docId' => 1,
            'page' => 1,
            'cols' => 2,
        ]);

        $result = $action->execute([$pageDef], 999);
        $this->assertEmpty($result->errors);
    }

    /**
     * Test that an invalid language ID is ignored.
     */
    public function testExecuteIgnoresInvalidLanguage(): void
    {
        $pageInfo = new PageInfo();
        $pageInfo->pageId = 10;
        $pageInfo->numCols = 1;
        $pageInfo->lang = 100;

        $tm = $this->createMock(TranscriptionManager::class);
        $tm->method('getPageInfoByDocPage')->willReturn($pageInfo);
        $tm->expects($this->once())
            ->method('updatePageSettings')
            ->with(
                10,
                $this->callback(fn(PageInfo $p) => $p->lang === 100),
                999
            );

        $action = $this->createAction($tm);

        $pageDef = PageUpdateDefinition::fromArray([
            'docId' => 1,
            'page' => 1,
            'lang' => 999,
        ]);

        $result = $action->execute([$pageDef], 999);
        $this->assertEmpty($result->errors);
    }

    /**
     * Test that a valid language ID is applied.
     */
    public function testExecuteAppliesValidLanguage(): void
    {
        $pageInfo = new PageInfo();
        $pageInfo->pageId = 10;
        $pageInfo->numCols = 1;
        $pageInfo->lang = 100;

        $tm = $this->createMock(TranscriptionManager::class);
        $tm->method('getPageInfoByDocPage')->willReturn($pageInfo);
        $tm->expects($this->once())
            ->method('updatePageSettings')
            ->with(
                10,
                $this->callback(fn(PageInfo $p) => $p->lang === 200),
                999
            );

        $action = $this->createAction($tm);

        $pageDef = PageUpdateDefinition::fromArray([
            'docId' => 1,
            'page' => 1,
            'lang' => 200,
        ]);

        $result = $action->execute([$pageDef], 999);
        $this->assertEmpty($result->errors);
    }

    /**
     * Test that hasErrors returns true when there are errors.
     */
    public function testResultHasErrors(): void
    {
        $tm = $this->createStub(TranscriptionManager::class);
        $action = $this->createAction($tm);

        $pageDef = PageUpdateDefinition::fromArray([]);

        $result = $action->execute([$pageDef], 999);

        $this->assertTrue($result->hasErrors());
    }
}
