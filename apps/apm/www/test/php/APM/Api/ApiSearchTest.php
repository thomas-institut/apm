<?php

namespace APM\Api;

use APM\System\ApmContainerKey;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Config\ApmSystemConfig;
use APM\System\Config\VersionConfig;
use APM\System\Lemmatizer\LemmatizerInterface;
use APM\System\Search\IndexType;
use APM\System\Search\SearchIndexManager;
use APM\System\Search\SearchQueryResult;
use APM\System\SystemManager;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

class ApiSearchTest extends TestCase
{
    public function testSearchDelegatesTokenQueryToSearchIndexManager(): void
    {
        $searchManager = $this->createMock(SearchIndexManager::class);
        $searchManager->expects($this->once())
            ->method('searchToken')
            ->with(IndexType::Transcriptions, 'ar', 'second', false, 2, '', '', 10)
            ->willReturn(new SearchQueryResult([['document' => ['id' => '1']]], 2, false));

        $request = $this->createStub(Request::class);
        $request->method('getParsedBody')->willReturn([
            'corpus' => 'transcriptions',
            'searched_phrase' => 'first second',
            'title' => '',
            'creator' => '',
            'keywordDistance' => 0,
            'lemmatize' => false,
            'lang' => 'ar',
            'queryPage' => 2,
        ]);

        $controller = new ApiSearch($this->createContainer($searchManager));

        $controller->search($request, new Response());
    }

    private function createContainer(SearchIndexManager $searchManager): ContainerInterface
    {
        $config = new ApmSystemConfig(new VersionConfig('', '', ''));
        $systemManager = $this->createStub(SystemManager::class);
        $logger = $this->createStub(LoggerInterface::class);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [ApmSystemConfig::class, $config],
            [SystemManager::class, $systemManager],
            [ApmContainerKey::API_USER_ID, 1],
            [LoggerInterface::class, $logger],
            [SearchIndexManager::class, $searchManager],
            [LemmatizerInterface::class, $this->createStub(LemmatizerInterface::class)],
            [SystemMainDataCache::class, $this->createStub(SystemMainDataCache::class)],
        ]);

        return $container;
    }
}