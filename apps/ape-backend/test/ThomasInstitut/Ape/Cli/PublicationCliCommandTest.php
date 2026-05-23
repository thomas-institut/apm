<?php

namespace ThomasInstitut\Ape\Cli;

use DI\Container;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\Ape\Managers\PublicationManager;
use ThomasInstitut\ApmPublicationApi\PublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationListing;

class PublicationCliCommandTest extends TestCase
{
    private $container;
    private $manager;
    private $command;

    protected function setUp(): void
    {
        $this->container = $this->createMock(Container::class);
        $this->manager = $this->createMock(PublicationManager::class);
        $this->command = new PublicationCliCommand($this->container);
    }

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
}
