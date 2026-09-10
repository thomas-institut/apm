<?php

namespace APM\System\Factories;

use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\DocumentManager;
use APM\System\Person\PersonManagerInterface;
use APM\System\Transcription\ApmTranscriptionManager;
use APM\System\Transcription\TranscriptionManager;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class TranscriptionManagerFactory
{

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public static function create(ContainerInterface $ci): TranscriptionManager
    {
        return new ApmTranscriptionManager(
            $ci,
            fn () => $ci->get(DocumentManager::class),
            fn () => $ci->get(PersonManagerInterface::class),
            fn () => $ci->get(SystemMainDataCache::class),
        );
    }
}