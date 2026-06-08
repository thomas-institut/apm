<?php

namespace ThomasInstitut\Ape\Cli;

use DI\Container;
use DI\DependencyException;
use DI\NotFoundException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\Ape\Managers\ApmCommunicationProblemException;
use ThomasInstitut\Ape\Managers\PublicationManager;
use ThomasInstitut\Ape\Managers\PublicationNotFoundException;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TextPublicationData;
use Throwable;

/**
 * @covers \ThomasInstitut\Ape\Cli\PublicationCliCommand
 */
class PublicationCliCommandTest extends TestCase
{
    /**
     * Tests that run() fails when no subcommand is given.
     */
    public function testRunReturnsFailureWhenNoCommandIsGiven(): void
    {
        $command = new PublicationCliCommand($this->createStub(Container::class));

        $result = $command->run(0, []);

        $this->assertFalse($result->success);
        $this->assertSame('No command given', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that run() fails for an invalid subcommand.
     */
    public function testRunReturnsFailureForInvalidCommand(): void
    {
        $command = new PublicationCliCommand($this->createStub(Container::class));

        $result = $command->run(1, ['bogus']);

        $this->assertFalse($result->success);
        $this->assertSame('Invalid command', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that list() prints available publications.
     */
    public function testRunListPrintsPublicationRows(): void
    {
        $manager = $this->createMock(PublicationManager::class);
        $publication = $this->createListing(1);
        $publication->type = PublicationType::Text;
        $publication->title = 'title1';

        $manager->expects($this->once())
            ->method('getPublicationListings')
            ->willReturn([$publication]);

        $command = new PublicationCliCommand($this->createContainerReturningManager($manager));
        $output = $this->captureRun($command, 1, ['list']);

        $this->assertTrue($output['result']->success);
        $this->assertStringContainsString(' 1:    1 text title1', $output['stdout']);
    }

    /**
     * Tests that list() reports when no publications are available.
     */
    public function testRunListPrintsNoPublicationsFoundWhenListIsEmpty(): void
    {
        $manager = $this->createMock(PublicationManager::class);
        $manager->expects($this->once())
            ->method('getPublicationListings')
            ->willReturn([]);

        $command = new PublicationCliCommand($this->createContainerReturningManager($manager));
        $output = $this->captureRun($command, 1, ['list']);

        $this->assertTrue($output['result']->success);
        $this->assertStringContainsString('No publications found', $output['stdout']);
    }

    /**
     * Tests that list() fails when the publication manager is unavailable.
     */
    public function testRunListReturnsFailureWhenManagerIsUnavailable(): void
    {
        $command = new PublicationCliCommand(
            $this->createContainerThrowingForManager(new NotFoundException('missing manager'))
        );

        $result = $command->run(1, ['list']);

        $this->assertFalse($result->success);
        $this->assertSame('Publication manager not available', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that get() prints the requested publication data.
     */
    public function testRunGetPrintsPublicationData(): void
    {
        $manager = $this->createMock(PublicationManager::class);
        $publicationData = $this->createPublicationData(123);

        $manager->expects($this->once())
            ->method('getPublicationData')
            ->with(123)
            ->willReturn($publicationData);

        $command = new PublicationCliCommand($this->createContainerReturningManager($manager));
        $output = $this->captureRun($command, 2, ['get', '123']);

        $this->assertTrue($output['result']->success);
        $this->assertStringContainsString('123', $output['stdout']);
        $this->assertStringContainsString('Text of publication 123', $output['stdout']);
    }

    /**
     * Tests that get() fails when no publication id is given.
     */
    public function testRunGetReturnsFailureWhenIdIsMissing(): void
    {
        $command = new PublicationCliCommand($this->createStub(Container::class));

        $result = $command->run(1, ['get']);

        $this->assertFalse($result->success);
        $this->assertSame('No publication id given', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that get() fails when the publication id is invalid.
     */
    public function testRunGetReturnsFailureWhenIdIsInvalid(): void
    {
        $command = new PublicationCliCommand($this->createStub(Container::class));

        $result = $command->run(2, ['get', 'not-a-number']);

        $this->assertFalse($result->success);
        $this->assertSame('Invalid publication id', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that get() fails when the publication manager is unavailable.
     */
    public function testRunGetReturnsFailureWhenManagerIsUnavailable(): void
    {
        $command = new PublicationCliCommand(
            $this->createContainerThrowingForManager(new DependencyException('missing manager'))
        );

        $result = $command->run(2, ['get', '123']);

        $this->assertFalse($result->success);
        $this->assertSame('Publication manager not available', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that get() fails when the publication does not exist.
     */
    public function testRunGetReturnsFailureWhenPublicationIsNotFound(): void
    {
        $manager = $this->createMock(PublicationManager::class);
        $manager->expects($this->once())
            ->method('getPublicationData')
            ->with(123)
            ->willThrowException(new PublicationNotFoundException('missing'));

        $command = new PublicationCliCommand($this->createContainerReturningManager($manager));
        $result = $command->run(2, ['get', '123']);

        $this->assertFalse($result->success);
        $this->assertSame('Publication not found', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that update() triggers a publication refresh.
     */
    public function testRunUpdate(): void
    {
        $manager = $this->createMock(PublicationManager::class);
        $manager->expects($this->once())
            ->method('updateFromApm');

        $command = new PublicationCliCommand($this->createContainerReturningManager($manager));
        $output = $this->captureRun($command, 1, ['update']);

        $this->assertTrue($output['result']->success);
        $this->assertStringContainsString('Successfully updated from APM', $output['stdout']);
    }

    /**
     * Tests that update() fails when the publication manager is unavailable.
     */
    public function testRunUpdateReturnsFailureWhenManagerIsUnavailable(): void
    {
        $command = new PublicationCliCommand(
            $this->createContainerThrowingForManager(new NotFoundException('missing manager'))
        );

        $result = $command->run(1, ['update']);

        $this->assertFalse($result->success);
        $this->assertSame('Publication manager not available', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that update() reports APM communication problems.
     */
    public function testRunUpdateReturnsFailureForApmCommunicationProblems(): void
    {
        $manager = $this->createMock(PublicationManager::class);
        $manager->expects($this->once())
            ->method('updateFromApm')
            ->willThrowException(new ApmCommunicationProblemException('timeout'));

        $command = new PublicationCliCommand($this->createContainerReturningManager($manager));
        $result = $command->run(1, ['update']);

        $this->assertFalse($result->success);
        $this->assertSame('Communication problem with APM: timeout', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that info() prints publication count and formatted timestamp.
     */
    public function testRunInfo(): void
    {
        $manager = $this->createMock(PublicationManager::class);
        $manager->expects($this->once())
            ->method('getPublicationListings')
            ->willReturn([new PublicationListing(), new PublicationListing()]);
        $manager->expects($this->once())
            ->method('getLastUpdateTimestamp')
            ->willReturn(1716474540);

        $command = new PublicationCliCommand($this->createContainerReturningManager($manager));
        $output = $this->captureRun($command, 1, ['info']);

        $this->assertTrue($output['result']->success);
        $this->assertStringContainsString('Number of publications: 2', $output['stdout']);
        $this->assertStringContainsString('Last update: 23.05.2024 14:29:00', $output['stdout']);
    }

    /**
     * Tests that info() prints 'never' when the system has not been updated yet.
     */
    public function testRunInfoNever(): void
    {
        $manager = $this->createMock(PublicationManager::class);
        $manager->expects($this->once())
            ->method('getPublicationListings')
            ->willReturn([]);
        $manager->expects($this->once())
            ->method('getLastUpdateTimestamp')
            ->willReturn(0);

        $command = new PublicationCliCommand($this->createContainerReturningManager($manager));
        $output = $this->captureRun($command, 1, ['info']);

        $this->assertTrue($output['result']->success);
        $this->assertStringContainsString('Number of publications: 0', $output['stdout']);
        $this->assertStringContainsString('Last update: never', $output['stdout']);
    }

    /**
     * Tests that info() fails when the publication manager is unavailable.
     */
    public function testRunInfoReturnsFailureWhenManagerIsUnavailable(): void
    {
        $command = new PublicationCliCommand(
            $this->createContainerThrowingForManager(new DependencyException('missing manager'))
        );

        $result = $command->run(1, ['info']);

        $this->assertFalse($result->success);
        $this->assertSame('Publication manager not available', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Creates a container that returns the given publication manager.
     */
    private function createContainerReturningManager(PublicationManager $manager): Container
    {
        $container = $this->createMock(Container::class);
        $container->expects($this->once())
            ->method('get')
            ->with(PublicationManager::class)
            ->willReturn($manager);

        return $container;
    }

    /**
     * Creates a container that throws when the publication manager is requested.
     */
    private function createContainerThrowingForManager(Throwable $exception): Container
    {
        $container = $this->createMock(Container::class);
        $container->expects($this->once())
            ->method('get')
            ->with(PublicationManager::class)
            ->willThrowException($exception);

        return $container;
    }

    /**
     * Captures stdout while running the command.
     *
     * @return array{result: CommandResult, stdout: string}
     */
    private function captureRun(PublicationCliCommand $command, int $argc, array $argv): array
    {
        ob_start();
        $result = $command->run($argc, $argv);
        $stdout = ob_get_clean();

        return [
            'result' => $result,
            'stdout' => $stdout,
        ];
    }

    /**
     * Creates a publication listing with initialized fields.
     */
    private function createListing(int $id): PublicationListing
    {
        $listing = new PublicationListing();
        $listing->id = $id;
        $listing->type = PublicationType::Edition;
        $listing->versionTimeString = '2026-05-24 10:00:00.000000';
        $listing->title = "Publication $id";
        $listing->description = "Description $id";

        return $listing;
    }

    /**
     * Creates publication data with initialized fields.
     */
    private function createPublicationData(int $id): TextPublicationData
    {
        $publicationData = new TextPublicationData();
        $publicationData->id = $id;
        $publicationData->type = PublicationType::Text;
        $publicationData->versionTimeString = '2026-05-24 10:00:00.000000';
        $publicationData->title = "Publication $id";
        $publicationData->description = "Description $id";
        $publicationData->text = "Text of publication $id";

        return $publicationData;
    }
}
