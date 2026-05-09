<?php

namespace APM\Api\Action;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Schema\Entity;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Transcription\TranscriptionManager;
use Exception;
use Psr\Log\LoggerInterface;

readonly class UpdatePageSettingsBulkAction
{

    public function __construct(
        private TranscriptionManager     $transcriptionManager,
        private ApmEntitySystemInterface $entitySystem,
        private LoggerInterface          $logger)
    {
    }

    /**
     * Execute the bulk update.
     *
     * @param PageUpdateDefinition[] $pageDefinitions
     * @param int $userId The user performing the update
     * @return UpdatePageSettingsBulkResult
     */
    public function execute(array $pageDefinitions, int $userId): UpdatePageSettingsBulkResult
    {
        $errors = [];
        $updatedPageIds = [];
        $requestedPageIds = [];
        $validLanguages = $this->entitySystem->getAllEntitiesForType(Entity::tLanguage);

        foreach ($pageDefinitions as $pageDef) {
            if (!isset($pageDef->docId) && !isset($pageDef->page)) {
                $errors[] = "No docId or page in request";
                continue;
            }

            $docId = $pageDef->docId;
            $pageNumber = $pageDef->page;

            try {
                $pageInfo = $this->transcriptionManager->getPageInfoByDocPage($docId, $pageNumber);
            } catch (PageNotFoundException|DocumentNotFoundException) {
                $errors[] = "Page not found, doc $docId page $pageNumber";
                continue;
            }

            $requestedPageIds[] = $pageInfo->pageId;

            $newPageInfo = clone $pageInfo;

            if (isset($pageDef->type)) {
                $newPageInfo->type = $pageDef->type;
            }

            if (isset($pageDef->foliation)) {
                if (!isset($pageDef->overwriteFoliation)) {
                    $errors[] = "No overwriteFoliation in request, doc $docId page $pageNumber";
                    continue;
                }
                if ($pageDef->overwriteFoliation) {
                    $newPageInfo->foliation = $pageDef->foliation;
                    $newPageInfo->foliationIsSet = true;
                }
            }

            if (isset($pageDef->cols)) {
                if ($pageInfo->numCols < $pageDef->cols) {
                    $newPageInfo->numCols = $pageDef->cols;
                }
            }

            if (isset($pageDef->lang)) {
                $newLang = $pageDef->lang;
                if (in_array($newLang, $validLanguages)) {
                    $newPageInfo->lang = $newLang;
                } else {
                    $this->logger->warning("Attempt to set page language to invalid entity id $newLang");
                }
            }

            try {
                $this->transcriptionManager->updatePageSettings($pageInfo->pageId, $newPageInfo, $userId);
                $updatedPageIds[] = $pageInfo->pageId;
            } catch (Exception $e) {
                $errors[] = "Error updating page {$pageInfo->pageId} ($docId:$pageNumber): " . $e->getMessage();
            }
        }

        return new UpdatePageSettingsBulkResult($requestedPageIds, $updatedPageIds, $errors);
    }

}