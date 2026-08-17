<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\CommandLine\CommandLineUtility;
use APM\System\PublicationManager\PublicationManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use ReflectionClass;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;

class PublicationToolTest extends TestCase
{
    /**
     * Creates a PublicationTool instance without running the CLI bootstrap constructor.
     *
     * @param ContainerInterface $container
     * @return PublicationTool
     * @throws \ReflectionException
     */
    private function createPublicationTool(ContainerInterface $container): PublicationTool
    {
        $tool = (new ReflectionClass(PublicationTool::class))->newInstanceWithoutConstructor();
        $containerProperty = (new ReflectionClass(CommandLineUtility::class))->getProperty('container');
        $containerProperty->setAccessible(true);
        $containerProperty->setValue($tool, $container);

        return $tool;
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
        $container = $this->createStub(ContainerInterface::class);
        $tool = $this->createPublicationTool($container);

        $help = $tool->getHelp();

        $this->assertStringContainsString('export <format> <id>', $help);
        $this->assertStringContainsString('TEI-XML for edition publications', $help);
    }

    /**
     * Verifies that TEI export is rejected for transcription publications.
     */
    public function testExportRejectsTeiForTranscriptionPublication(): void
    {
        $publication = new TranscriptionData();
        $publication->id = 123;
        $publication->type = PublicationType::Transcription;

        $publicationManager = $this->createMock(PublicationManagerInterface::class);
        $publicationManager->expects($this->once())
            ->method('getPublication')
            ->with(123)
            ->willReturn($publication);

        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->once())
            ->method('get')
            ->with(PublicationManagerInterface::class)
            ->willReturn($publicationManager);

        $tool = $this->createPublicationTool($container);

        ob_start();
        $result = $this->invokeExport($tool, 'tei', 123);
        $output = ob_get_clean();

        $this->assertSame(1, $result);
        $this->assertStringContainsString('TEI export is only supported for edition publications', $output);
    }
}
