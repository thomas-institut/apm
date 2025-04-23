<?php

namespace APM\Jobs;

use APM\CommandLine\IndexManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateTranscriptionsIndex extends ApiSearchUpdateTypesenseIndex implements JobHandlerInterface
{
    /**
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    public function run(SystemManager $sm, array $payload): bool
    {
        $logger = $sm->getLogger();
        $config = $sm->getConfig();

        try {
            $this->initializeTypesenseClient($config);
        } catch (\Exception $e) {
            $logger->debug('Connecting to OpenSearch server failed.');
            return false;
        }


        // Fetch data from payload
        $doc_id = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];
        $page_id = $sm->getDocumentManager()->getPageIdByDocPage($doc_id, $page);
        $argv = [0, 'transcriptions', 'update-add', $page_id, $col];

       try {
            (new IndexManager ($config, 0, $argv))->run();
        } catch (\Exception $e) {
            $sm->getLogger()->error("Exception: " . $e->getMessage());
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
