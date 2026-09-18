<?php

namespace APM\System\Jobs;

use APM\CommandLine\IndexTool;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\System\ApmContainerKey;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use Http\Client\Exception;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use Typesense\Exceptions\TypesenseClientError;

readonly class UpdateApiSearchTranscriptionsIndexJob implements JobHandlerInterface
{
    public function __construct(private ContainerInterface $container) {}

    /**
     * @param array $payload
     * @param string $jobName
     * @return bool
     * @throws DocumentNotFoundException
     * @throws Exception
     * @throws PageNotFoundException
     * @throws TypesenseClientError
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function run(array $payload, string $jobName): bool
    {

        /** @var array $config */
        $config = $this->container->get(ApmContainerKey::CONFIG_ARRAY);

        /** @var LoggerInterface $logger */
        $logger = $this->container->get(LoggerInterface::class);

        /** @var DocumentManager $documentManager */
        $documentManager = $this->container->get(DocumentManager::class);

        // Fetch data from payload
        $docId = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];
        $pageId = $documentManager->getPageIdByDocPage($docId, $page);

        $im = new IndexTool($config, 0, []);
        $im->setIndexNamePrefix('transcriptions');


        try {
            $im->updateOrAddItem($pageId, $col);
            return true;
        } catch (EntityDoesNotExistException|DocumentNotFoundException|PageNotFoundException|InvalidTimeStringException $e) {
            $logger->error("Error updating transcription index for page $pageId col $col: " . $e->getMessage());
            return false;
        }
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}
