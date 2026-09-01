<?php

namespace APM\System\Factories;

use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\NodeService\NodeServiceClient;
use APM\System\LanguageManager;
use APM\System\PublicationManager\ApmPublicationManager;
use APM\System\PublicationManager\PublicationManager;
use APM\System\SystemManager;
use Predis\Client;
use Psr\Log\LoggerInterface;

class PublicationManagerFactory
{
    public static function create(SystemManager     $sm,
                                  LanguageManager   $lm,
                                  Client            $valkeyClient,
                                  NodeServiceClient $nodeServiceClient,
                                  MultiChunkEditionManager $mceManager,
                                  LoggerInterface   $logger): PublicationManager
    {
        return new ApmPublicationManager(
            $sm->getDocumentManager(),
            $sm->getTranscriptionManager(),
            $lm,
            $mceManager,
            $sm->getCollationTableManager(),
            $nodeServiceClient,
            $logger,
            $sm->getImageSources(),
            $valkeyClient
        );
    }
}