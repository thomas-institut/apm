<?php

namespace APM\Site;

use APM\System\Config\ApmSystemConfig;
use APM\System\Config\GeneralConfig;
use APM\System\Config\VersionConfig;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;

class SiteControllerTest extends TestCase
{
    public function testViteDevelopmentUrlsUseConfiguredPort(): void
    {
        $config = new ApmSystemConfig(
            new VersionConfig('', '', ''),
            general: new GeneralConfig(devMode: true, viteDevServerPort: 5180)
        );
        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [ApmSystemConfig::class, $config],
            [LoggerInterface::class, $this->createStub(LoggerInterface::class)],
        ]);

        $controller = new class($container) extends SiteController {
            public function getViteImportHtmlForTest(): array
            {
                return $this->getViteImportHtml(['js/main.js']);
            }

            public function getReactPluginModuleHtmlForTest(): string
            {
                return $this->getReactPluginModuleHtml();
            }
        };

        [$viteJsImportsHtml] = $controller->getViteImportHtmlForTest();
        $reactPluginModuleHtml = $controller->getReactPluginModuleHtmlForTest();

        $this->assertStringContainsString('http://localhost:5180/@vite/client', $viteJsImportsHtml);
        $this->assertStringContainsString('http://localhost:5180/js/main.js', $viteJsImportsHtml);
        $this->assertStringContainsString('http://localhost:5180/@react-refresh', $reactPluginModuleHtml);
    }
}