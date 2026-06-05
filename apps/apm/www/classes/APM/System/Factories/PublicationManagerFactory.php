<?php

namespace APM\System\Factories;

use APM\NodeService\NodeServiceClient;
use APM\System\LanguageManager;
use APM\System\PublicationManager\ApmPublicationManager;
use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\SystemManager;
use Predis\Client;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;

class PublicationManagerFactory
{
    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public static function create(ContainerInterface $ci): PublicationManagerInterface
    {
        /** @var SystemManager $sm */
        $sm = $ci->get(SystemManager::class);
        /** @var LanguageManager $lm */
        $lm = $ci->get(LanguageManager::class);
        $valkeyClient = $ci->get(Client::class);
        $nodeServiceClient = $ci->get(NodeServiceClient::class);
        $logger = $ci->get(LoggerInterface::class);

        return new ApmPublicationManager(
            $sm->getDocumentManager(),
            $sm->getTranscriptionManager(),
            $lm,
            $sm->getMultiChunkEditionManager(),
            $sm->getCollationTableManager(),
            $nodeServiceClient,
            $logger,
            $sm->getImageSources(),
            $valkeyClient
        );
    }
}