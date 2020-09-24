<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace APM\Api;


use APM\FullTranscription\ColumnVersionInfo;
use AverroesProject\TxText\Item;
use phpDocumentor\Reflection\Element;
use Psr\Container\ContainerInterface;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

class ApiTranscription extends ApiController
{

    /**
     * @var array[]
     */
    private $fakeAvailableTranscriptions;

    public function __construct(ContainerInterface $ci)
    {
        parent::__construct($ci);

        $this->fakeAvailableTranscriptions = [
            [ 'docId' => 4, 'dareId' => 'BOOK-DARE-M-AT-GRZ-UB-II.482', 'pages' => [ 2,4,5,6]],
            [ 'docId' => 128, 'dareId' => 'BOOK-DARE-M-AT-ADO-STB-480','pages' => [ 12,24,25,26]],
            [ 'docId' => 130, 'dareId' => 'BOOK-DARE-M-BE-LEU-KUL-1515','pages' => [ 100,101]],
            [ 'docId' => 131, 'dareId' => 'BOOK-DARE-M-FR-PAR-BNF-lat.16088','pages' => [ 4,5,6]],
            ];
    }

    public function getList(Request $request, Response $response) {
        $publishedVersions = $this->systemManager->getTranscriptionManager()->getColumnVersionManager()->getPublishedVersions();

        $docs = $this->getDocsFromVersions($publishedVersions);
        $list = [];
        foreach($docs as $docId => $pageNumbers) {

            $docInfo = $this->getDataManager()->getDocById($docId);
            $this->debug('Doc Info', $docInfo);
            $listEntry = [ 'docId' => $docId, 'pages' => $pageNumbers];
            $listEntry['title'] = $docInfo['title'];
            if ($docInfo['image_source'] === 'dare' || $docInfo['image_source'] === 'dare-deepzoom') {
                $listEntry['source'] = 'DARE';
                $listEntry['dareId'] = $docInfo['image_source_data'];
            } else {
                $listEntry['source'] = 'APM';
            }

            $list[] = $listEntry;

        }

        return $this->responseWithJson($response, [
            'list' => $list,
            'apiCallDateTime' => date(DATE_ATOM) ]);
    }

    /**
     * Returns an array with keys corresponding to docIds populated with
     * arrays that list the page numbers in the given versions
     *
     * @param array $versions
     * @return array
     */
    protected function getDocsFromVersions(array $versions) : array {
        $docIds = [];
        $dm = $this->getDataManager();
        foreach($versions as $version) {
            /**@var $version ColumnVersionInfo */
            $pageInfo = $dm->getPageInfo($version->pageId);
            $docId = intval($pageInfo['doc_id']);
            if (!isset($docIds[$docId])) {
                $docIds[$docId] = [];
            }
            $docIds[$docId][] = intval($pageInfo['page_number']);
        }

        return $docIds;

    }

    public function getTranscription(Request $request, Response $response) {
        $docId = intval($request->getAttribute('docId'));
        $pageNumber = intval($request->getAttribute('page'));



        $dm = $this->getDataManager();
        $pageId = $dm->getPageIdByDocPage($docId, $pageNumber);
        $pageInfo = $dm->getPageInfo($pageId);
        $numCols = $pageInfo['num_cols'];
        if ($numCols === 0) {
            return $this->responseWithJson($response, [
                [ 'error' => "Doc $docId page $pageNumber does not have any columns defined"]
            ], 409);
        }

        $responseData =  [
            'docId' => $docId,
            'pageId' => $pageId,
            'pageNumber' => $pageNumber,
            'pageSequence' => intval($pageInfo['seq']),
            'numColumns' => $numCols
        ];
        $this->debug('Page info', $pageInfo);
        if (isset($pageInfo['foliation']) && !is_null($pageInfo['foliation'])) {
            $responseData['foliation'] = $pageInfo['foliation'];
        }
        $docInfo = $this->getDataManager()->getDocById($docId);

        if ($docInfo['image_source'] === 'dare' || $docInfo['image_source'] === 'dare-deepzoom') {
            $responseData['source'] = 'DARE';
            $responseData['dareId'] = $docInfo['image_source_data'];
        } else {
            $responseData['source'] = 'APM';
        }


        $transcriberIds = [];
        $columns = [];

        $versionManager = $this->systemManager->getTranscriptionManager()->getColumnVersionManager();
        for ($col = 1; $col <= $numCols; $col++) {
            $versions = $versionManager->getColumnVersionInfoByPageCol($pageId, $col);
            // for the moment, find the first published version in the array
            foreach($versions as $version) {
                $transcriberIds[$version->authorId] = 1;
                if ($version->isPublished) {
                    $columnData = [ 'column' => $col];
                    $elements = $this->getDataManager()->getColumnElementsByPageId($pageId, $col, $version->timeFrom);
                    $columnData['plainText'] = $this->getPlainTextFromElements($elements);
                    $columnData['text'] = $this->getExportDataFromElements($elements);
                    $columnData['version'] = $version->timeFrom;
                    $columnData['isLatestVersion'] = $version->timeUntil === TimeString::END_OF_TIMES;
                    $columnData['versionTranscriberId'] = $version->authorId;
                    $columns[] = $columnData;
                }
            }
        }

        if (count($columns) === 0) {
            // nothing is published!
            return $this->responseWithJson($response, [
                [ 'error' => "Doc $docId page $pageNumber not available for download"]
            ], 409);
        }

        // get transcriber info
        $transcriberInfo = [];
        foreach(array_keys($transcriberIds) as $userId) {
            $userInfo = $this->getDataManager()->userManager->getUserInfoByUserId($userId);
            $transcriberInfo[] = [
                'ApmId' => $userId,
                'FullName' => $userInfo['fullname']
                ];
        }

        $responseData['status'] = 'OK';
        $responseData['transcribers'] = $transcriberInfo;
        $responseData['columns'] = $columns;
        $responseData['apiCallDateTime'] = date(DATE_ATOM);


        return $this->responseWithJson($response, $responseData);
    }

    private function getPlainTextFromElements($elements) : string {
        $text = '';
        foreach($elements as $element) {
            if ($element->type === \AverroesProject\ColumnElement\Element::LINE) {
                foreach($element->items as $item) {
                    switch($item->type) {
                        case Item::TEXT:
                            $text .= $item->theText;
                            break;

                        case Item::NO_WORD_BREAK:
                            $text .= '-';
                            break;
                    }

                }
            }
        }
        return $text;
    }

    private function getExportDataFromElements($elements) {
        // only main text for the time being
        $mainText = [];
        $itemToType = [
            Item::TEXT => 'text',
            Item::BOLD_TEXT => 'bold',
            Item::RUBRIC => 'rubric',
            Item::ITALIC => 'italic',
            Item::HEADING => 'heading',
            Item::INITIAL => 'initial',
            Item::GLIPH => 'gliph',
            Item::MATH_TEXT => 'math',
            Item::PARAGRAPH_MARK => 'paragraph_mark'
        ];
        foreach ($elements as $element) {
            if ($element->type === \AverroesProject\ColumnElement\Element::LINE){
                foreach($element->items as $item) {
                    if (array_search($item->type, array_keys($itemToType)) !== false) {
                        $mainText[] = [
                            'type' => $itemToType[$item->type],
                            'text' => $item->getText(),
                            'lang' => $item->getLang()
                        ];
                        continue;
                    }

                    switch($item->type) {

                        case Item::NO_WORD_BREAK:
                            $mainText[] = [ 'type' => 'wb' ];
                            break;

                        case Item::CHUNK_MARK:
                            $mainText[] = [
                                'type' => 'chunk',
                                'subtype' => $item->getType(),
                                'workId' => $item->getDareId(),
                                'chunkNumber' => $item->getChunkNumber(),
                                'segment' => $item->getChunkSegment(),
                                'localId' => $item->getWitnessLocalId()
                            ];
                            break;

                    }

                }
            }

        }
        return $mainText;
    }

}