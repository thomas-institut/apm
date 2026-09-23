<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\CommandLine\ApmCtl\PublicationTool;
use APM\System\PublicationManager\PublicationManager;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;

class PublicationToolTest extends TestCase
{
    /**
     * Creates a PublicationTool instance.
     *
     * @param PublicationManager $publicationManager
     * @return PublicationTool
     */
    private function createPublicationTool(PublicationManager $publicationManager): PublicationTool
    {
        return new PublicationTool($publicationManager);
    }

    /**
     * Invokes the private export method on PublicationTool.
     *
     * @param PublicationTool $tool
     * @param string $format
     * @param int $pubId
     * @return int
     * @throws \ReflectionException
     */
    private function invokeExport(PublicationTool $tool, string $format, int $pubId): int
    {
        $method = (new ReflectionClass(PublicationTool::class))->getMethod('export');
        $method->setAccessible(true);

        return $method->invoke($tool, $format, $pubId);
    }

    /**
     * Verifies that the help text documents TEI export as edition-only.
     */
    public function testGetHelpDocumentsTeiExportAsEditionOnly(): void
    {
        $publicationManager = $this->createStub(PublicationManager::class);
        $tool = $this->createPublicationTool($publicationManager);

        $help = $tool->getUsage();

        $this->assertStringContainsString('export json|evt <id>', $help);
        $this->assertStringContainsString('only for editions', $help);
    }

    /**
     * Verifies that TEI export is rejected for transcription publications.
     */
    public function testExportRejectsTeiForTranscriptionPublication(): void
    {
        $publication = new TranscriptionData();
        $publication->id = 123;
        $publication->type = PublicationType::Transcription;

        $publicationManager = $this->createMock(PublicationManager::class);
        $publicationManager->expects($this->once())
            ->method('getPublication')
            ->with(123)
            ->willReturn($publication);

        $tool = $this->createPublicationTool($publicationManager);

        ob_start();
        $result = $this->invokeExport($tool, 'tei', 123);
        $output = ob_get_clean();

        $this->assertSame(1, $result);
        $this->assertStringContainsString('TEI export is only supported for edition publications', $output);
    }
}
