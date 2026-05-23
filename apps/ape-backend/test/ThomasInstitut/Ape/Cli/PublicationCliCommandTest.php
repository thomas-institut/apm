<?php

namespace ThomasInstitut\Ape\Cli;

use DI\Container;
use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\Ape\Managers\PublicationManager;
use ThomasInstitut\ApmPublicationApi\PublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationListing;

class PublicationCliCommandTest extends TestCase
{
    private Container&MockObject $container;
    private $manager;
    private $command;

    protected function setUp(): void
    {
        $this->container = $this->createMock(Container::class);
        $this->manager = $this->createMock(PublicationManager::class);
        $this->command = new PublicationCliCommand($this->container);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testRunList()
    {
        $this->container->method('get')->with(PublicationManager::class)->willReturn($this->manager);

        $pub1 = new PublicationListing();
        $pub1->id = 1;
        $pub1->type = 'type1';
        $pub1->title = 'title1';

        $this->manager->method('getPublicationListings')->willReturn([$pub1]);

        ob_start();
        $result = $this->command->run(1, ['list']);
        $output = ob_get_clean();

        $this->assertTrue($result->success);
        // printf("%2d: %4d %s %s\n", $index + 1, $publication->id, $publication->type, $publication->title);
        // " 1:    1 type1 title1\n"
        $this->assertStringContainsString(' 1:    1 type1 title1', $output);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testRunGet()
    {
        $this->container->method('get')->with(PublicationManager::class)->willReturn($this->manager);

        // PublicationData is abstract, but we can mock it
        $pubData = $this->createMock(PublicationData::class);
        $pubData->id = 123;

        $this->manager->method('getPublicationData')->with(123)->willReturn($pubData);

        ob_start();
        $result = $this->command->run(2, ['get', '123']);
        $output = ob_get_clean();

        $this->assertTrue($result->success);
        $this->assertStringContainsString('123', $output);
    }

    public function testRunUpdate()
    {
        $this->container->method('get')->with(PublicationManager::class)->willReturn($this->manager);

        $this->manager->expects($this->once())->method('updateFromApm');

        ob_start();
        $result = $this->command->run(1, ['update']);
        $output = ob_get_clean();

        $this->assertTrue($result->success);
        $this->assertStringContainsString('Successfully updated from APM', $output);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testRunInfo()
    {
        $this->container->method('get')->with(PublicationManager::class)->willReturn($this->manager);

        $this->manager->method('getPublicationListings')->willReturn([new PublicationListing(), new PublicationListing()]);
        $this->manager->method('getLastUpdateTimestamp')->willReturn(1716474540); // 2024-05-23 14:29:00 UTC approximately

        ob_start();
        $result = $this->command->run(1, ['info']);
        $output = ob_get_clean();

        $this->assertTrue($result->success);
        $this->assertStringContainsString('Number of publications: 2', $output);
        $this->assertStringContainsString('Last update: 23.05.2024 14:29:00', $output);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testRunInfoNever()
    {
        $this->container->method('get')->with(PublicationManager::class)->willReturn($this->manager);

        $this->manager->method('getPublicationListings')->willReturn([]);
        $this->manager->method('getLastUpdateTimestamp')->willReturn(0);

        ob_start();
        $result = $this->command->run(1, ['info']);
        $output = ob_get_clean();

        $this->assertTrue($result->success);
        $this->assertStringContainsString('Number of publications: 0', $output);
        $this->assertStringContainsString('Last update: never', $output);
    }
}
