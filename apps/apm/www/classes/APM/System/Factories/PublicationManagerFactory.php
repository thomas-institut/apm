<?php

namespace APM\System\Factories;

use APM\CollationTable\CollationTableManager;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\NodeService\NodeServiceClient;
use APM\System\Document\DocumentManager;
use APM\System\LanguageManager;
use APM\System\PublicationManager\ApmPublicationManager;
use APM\System\PublicationManager\PublicationManager;
use APM\System\SystemManager;
use APM\System\Transcription\TranscriptionManager;
use Predis\Client;
use Psr\Log\LoggerInterface;

class PublicationManagerFactory
{
    public static function create(SystemManager            $sm,
                                  DocumentManager          $dm,
                                  TranscriptionManager     $tm,
                                  CollationTableManager    $ctm,
                                  LanguageManager          $lm,
                                  Client                   $valkeyClient,
                                  NodeServiceClient        $nodeServiceClient,
                                  MultiChunkEditionManager $mceManager,
                                  LoggerInterface          $logger): PublicationManager
    {
        return new ApmPublicationManager(
            $dm,
            $tm,
            $lm,
            $mceManager,
            $ctm,
            $nodeServiceClient,
            $logger,
            $sm->getImageSources(),
            $valkeyClient
        );
    }
}