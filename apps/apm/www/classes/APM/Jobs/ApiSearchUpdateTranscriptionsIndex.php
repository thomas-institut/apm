<?php

namespace APM\Jobs;

use APM\CommandLine\IndexManager;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\SystemManager;
use Http\Client\Exception;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use Typesense\Exceptions\TypesenseClientError;

class ApiSearchUpdateTranscriptionsIndex extends ApiSearchUpdateTypesenseIndex implements JobHandlerInterface
{
    public function __construct(private SystemManager $sm) {}

    /**
     * @param array $payload
     * @return bool
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     * @throws Exception
     * @throws TypesenseClientError
     */
    public function run(array $payload, string $jobName): bool
    {

        $config = $this->sm->getConfig();

        // Fetch data from payload
        $docId = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];
        $pageId = $this->sm->getDocumentManager()->getPageIdByDocPage($docId, $page);

        $im = new IndexManager($config, 0, []);
        $im->setIndexNamePrefix('transcriptions');


        try {
            $im->updateOrAddItem($pageId, $col);
            return true;
        } catch (EntityDoesNotExistException|DocumentNotFoundException|PageNotFoundException|InvalidTimeStringException $e) {
            $this->sm->getLogger()->error("Error updating transcription index for page $pageId col $col: " . $e->getMessage());
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
