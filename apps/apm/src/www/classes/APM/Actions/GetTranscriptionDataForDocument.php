<?php

namespace APM\Actions;

use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TranscriptionManager;
use APM\System\Transcription\TxText\ChunkMark;
use APM\System\Transcription\TxText\Item;
use ThomasInstitut\ApmPublicationApi\TranscriptionColumn;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;
use ThomasInstitut\ApmPublicationApi\TranscriptionPage;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;

class GetTranscriptionDataForDocument
{
    public function __construct(private readonly DocumentManager $dm, private TranscriptionManager $tm)
    {

    }

    /**
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     * @throws InvalidTimeStringException
     */
    public function getTranscriptionDataForDocument(int $docId): TranscriptionData
    {

        $docInfo = $this->dm->getDocInfo($docId, true);

        $data = new TranscriptionData();

        $data->id = $docInfo->id;
        $data->title = $docInfo->title;

        // TODO: add language code

        $pages = [];
        foreach ($docInfo->pageIds as $pageId) {
            $txPage = new TranscriptionPage();
            $pageInfo = $this->dm->getPageInfo($pageId);
            $txPage->foliation = $pageInfo->foliation;
            $txPage->pageNumber = $pageInfo->sequence;
            $txPage->columns = [];
            // TODO add image url
            for ($i = 0; $i < $pageInfo->numCols; $i++) {
                $txCol = new TranscriptionColumn();
                $elements = $this->tm->getColumnElementsByPageId($pageId, $i + 1);
                $txCol->transcriptionText = $this->getTranscriptionTextFromElements($elements);
                $txPage->columns[] = $txCol;
            }
            $pages[] = $txPage;
        }
        $data->pages = $pages;
        return $data;
    }

    /**
     * @param Element[] $elements
     * @return string
     */
    private function getTranscriptionTextFromElements(array $elements): string
    {
        $text = '';
        foreach ($elements as $element) {
            if ($element->type === Element::LINE) {
                foreach($element->items as $item) {
                    if ($item->type === Item::CHUNK_MARK) {
                        /** @var ChunkMark $item */
                        $segment = $item->getChunkSegment();
                        $startMark = 'Start ';
                        $endMark = '';
                        if ($item->getType() === ChunkMark::CHUNK_END) {
                            $startMark = '';
                            $endMark = ' end';
                        }
                        if ($segment === 1) {
                            $text .= sprintf("[%s%s-%d%s]", $startMark, $item->getDareId(), $item->getChunkNumber(), $endMark);
                        } else {
                            $text .= sprintf("[%s%s-%d-%d%s]", $startMark, $item->getDareId(), $item->getChunkNumber(), $segment, $endMark);
                        }
                    } else {
                        $text .= $item->theText;
                    }
                }
            }
        }
        return trim($text);
    }
}