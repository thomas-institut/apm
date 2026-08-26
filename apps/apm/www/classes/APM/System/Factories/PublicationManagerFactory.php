<?php

namespace APM\System\Factories;

use APM\NodeService\NodeServiceClient;
use APM\System\LanguageManager;
use APM\System\PublicationManager\ApmPublicationManager;
use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\SystemManager;
use Predis\Client;
use Psr\Log\LoggerInterface;

class PublicationManagerFactory
{
    public static function create(SystemManager     $sm,
                                  LanguageManager   $lm,
                                  Client            $valkeyClient,
                                  NodeServiceClient $nodeServiceClient,
                                  LoggerInterface   $logger): PublicationManagerInterface
    {
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