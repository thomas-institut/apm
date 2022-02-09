<?php

/* 
 *  Copyright (C) 2019-2021 Universität zu Köln
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

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

use APM\CollationTable\CollationTableVersionInfo;
use APM\FullTranscription\DocInfo;
use APM\FullTranscription\PageInfo;
use APM\System\WitnessInfo;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use InvalidArgumentException;
use phpDocumentor\Reflection\Types\This;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;


/**
 * Site Controller class
 *
 */
class SiteCollationTable extends SiteController
{
    // This will be added to the error pages within an HTML comment so
    // that unit testing can check that the right error pages are 
    // generated
    const ERROR_SIGNATURE_PREFIX = 'CollationTableError_8kn7KjcyAp_';
    
    const ERROR_NO_DATA = 'NoData';
    const ERROR_NO_OPTIONS = 'NoOptions';
    const ERROR_MISSING_REQUIRED_OPTION = 'MissingRequiredOption';
    const ERROR_UNKNOWN_PRESET = 'UnknownPreset';
    const ERROR_INVALID_LANGUAGE = 'InvalidLanguage';
    const ERROR_INVALID_WITNESS_TYPE = 'InvalidWitnessType';
    const ERROR_INVALID_WITNESS_ID = 'InvalidWitnessId';
    const ERROR_UNRECOGNIZED_OPTION = 'UnrecognizedOption';
    
    const TEMPLATE_ERROR = 'chunk-collation-error.twig';
    const TEMPLATE_COLLATION_TABLE = 'collation-table.twig';
    const TEMPLATE_EDIT_COLLATION_TABLE_OLD = 'collation-edit.twig';
    const TEMPLATE_EDITION_COMPOSER = 'edition-composer.twig';
    const TEMPLATE_EDIT_COLLATION_TABLE_ERROR = 'collation.edit.error.twig';

    /**
     * Serves the collation table editor.
     * The collation table editor handles both saved collation tables and chunk editions,
     * the difference is made by the JS application
     *
     * @param Request $request
     * @param Response $response
     * @return Response|\Slim\Psr7\Response
     */
    public function editCollationTable(Request $request, Response $response) {
        $tableId = intval($request->getAttribute('tableId'));

        $this->profiler->start();
        $this->logger->debug("Edit collation table id $tableId");

        $ctManager = $this->systemManager->getCollationTableManager();
        try {
            $ctData = $ctManager->getCollationTableById($tableId);
        } catch (InvalidArgumentException $e) {
            $this->logger->info("Table $tableId requested for editing not found");
            return $this->renderPage($response,self::TEMPLATE_EDIT_COLLATION_TABLE_ERROR, [
                'tableId' => $tableId,
                'message' => 'Table not found'
            ]);
        }

        $versionInfo = $ctManager->getCollationTableVersions($tableId);
        $chunkId = $ctData['chunkId'] ?? $ctData['witnesses'][0]['chunkId'];
        [ $workId, $chunkNumber] = explode('-', $chunkId);

        $dm = $this->dataManager;
        $rawWorkInfo = $dm->getWorkInfo($workId);
        $workInfo = [
            'authorId' => intval($rawWorkInfo['author_id']),
            'title' => $rawWorkInfo['title']
        ];

        $people = [];
        $people[] = $workInfo['authorId'];
        $people = array_merge($people, $this->getMentionedAuthorsFromCtData($ctData));
        $people = array_merge($people, $this->getMentionedPeopleFromVersionArray($versionInfo));
        $peopleInfo = $this->getAuthorInfoArrayFromList($people, $dm->userManager);

        $docs = $this->getMentionedDocsFromCtData($ctData);
        $docInfo = $this->getDocInfoArrayFromList($docs, $this->systemManager->getTranscriptionManager()->getDocManager());

        $this->profiler->stop();
        $this->logProfilerData("Edit Collation Table");
        $this->codeDebug('Editor Type', [$request->getAttribute('type')]);
        if ($ctData['type'] === 'edition') {
            $template = $request->getAttribute('type') !== 'old' ? self::TEMPLATE_EDITION_COMPOSER : self::TEMPLATE_EDIT_COLLATION_TABLE_OLD;
        } else {
            $template = self::TEMPLATE_EDIT_COLLATION_TABLE_OLD;
        }

        $um = $this->dataManager->userManager;
        $isTechSupport = $um->isRoot($this->userInfo['id']) || $um->userHasRole($this->userInfo['id'], 'techSupport');
        $this->codeDebug("Tech support: $isTechSupport", [ $this->userInfo]);

        return $this->renderPage($response, $template, [
            'userId' => $this->userInfo['id'],
            'isTechSupport' => $isTechSupport,
            'workId' => $workId,
            'chunkNumber' => $chunkNumber,
            'tableId' => $tableId,
            'collationTableData' => $ctData,
            'workInfo' => $workInfo,
            'peopleInfo' => $peopleInfo,
            'docInfo' => $docInfo,
            'versionInfo' => $versionInfo,
        ]);
    }

    protected function getMentionedPeopleFromVersionArray($versionArray) : array {
        $people = [];
        foreach($versionArray as $version) {
            /** @var CollationTableVersionInfo $version */
            $people[] = $version->authorId;
        }
        return $people;
    }

    protected function getMentionedAuthorsFromCtData(array $ctData) : array {
        $authors = [];

        foreach($ctData['witnesses'] as $witness) {
            if ($witness['witnessType'] === WitnessType::FULL_TRANSCRIPTION) {
                foreach($witness['items']  as $item) {
                    if (isset($item['notes'])) {
                        foreach($item['notes'] as $note) {
                            $authors[] = $note['authorId'];
                        }
                    }
                }
            }
        }

        return $authors;
    }

    protected function getMentionedDocsFromCtData(array $ctData) : array {
        $docs = [];
        foreach($ctData['witnesses'] as $witness) {
            if ($witness['witnessType'] === WitnessType::FULL_TRANSCRIPTION) {
                $docs[] = $witness['docId'];
            }
        }
        return $docs;
    }

    /**
     * @param Request $request
     * @param Response $response
     * @param $args
     * @return Response
     */
    public function automaticCollationPageGet(Request $request, Response $response, $args): Response
    {
        $workId = $request->getAttribute('work');
        $chunkNumber = intval($request->getAttribute('chunk'));
        $language = $request->getAttribute('lang');
        $ignorePunctuation = true;
        if (isset($args['ignore_punct'])) {
            $ignorePunctuation = ($args['ignore_punct'] !== 'withpunct');
        }

        $collationPageOptions = [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'lang' => $language,
            'ignorePunctuation' => $ignorePunctuation,
            'witnesses' => [], 
            'partialCollation' => false,
            'isPreset' => false
        ];
        // no 'normalizers' in $collationPageOptions, which will cause the standard normalizers to be applied

        // get witnesses to include
        if (isset($args['witnesses'])) {
            $witnessesInArgs = explode('/', $args['witnesses']);
            foreach ($witnessesInArgs as $argWitnessSpec) {
                if ($argWitnessSpec === '') {
                    continue;
                }
                if (ctype_digit($argWitnessSpec)) {
                    // for compatibility with existing API calls, if the argWitnessSpec is just a number,
                    // it defaults to a full transcription with local witness Id 'A'
                    $docId = intval($argWitnessSpec);
                    if ($docId !== 0) {
                        $collationPageOptions['witnesses'][] = [
                            'type' => WitnessType::FULL_TRANSCRIPTION,
                            'id' => $docId,
                            'lwid' => 'A',
                            'systemId' => WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, 'A')
                        ];
                    }
                    continue;
                }
                $specs = explode('-', $argWitnessSpec);
                if (count($specs) >= 2) {
                    $witnessType = $specs[0];
                    if ($witnessType !== WitnessType::FULL_TRANSCRIPTION) {
                        $msg = 'Non-supported witness type given: ' . $witnessType;
                        $this->logger->error($msg, [ 'args' => $args]);
                        return $this->renderPage($response, self::TEMPLATE_ERROR, [
                            'work' => $workId,
                            'chunk' => $chunkNumber,
                            'lang' => $language,
                            'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_INVALID_WITNESS_TYPE,
                            'message' => $msg
                        ]);
                    }
                    // for now, only full transcriptions are implemented, so the second field in
                    // the witness spec must be a number
                    if (!ctype_digit($specs[1])) {
                        $msg = 'Invalid doc id given: ' . $specs[1];
                        $this->logger->error($msg, [ 'args' => $args]);
                        return $this->renderPage($response, self::TEMPLATE_ERROR, [
                            'work' => $workId,
                            'chunk' => $chunkNumber,
                            'lang' => $language,
                            'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_INVALID_WITNESS_ID,
                            'message' => $msg
                        ]);
                    }
                    $docId = intval($specs[1]);
                    $lwid = 'A';
                    if (isset($specs[2])) {
                        $lwid = $specs[2];
                    }
                    $collationPageOptions['witnesses'][] = [
                        'type' =>  $witnessType,
                        'id' => $docId,
                        'lwid' => $lwid,
                        'systemId' => WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $lwid)
                    ];
                    continue;

                }
                //
                $msg = 'Unrecognized option : ' . $argWitnessSpec;
                $this->logger->error($msg, [ 'args' => $args]);
                return $this->renderPage($response, self::TEMPLATE_ERROR, [
                    'work' => $workId,
                    'chunk' => $chunkNumber,
                    'lang' => $language,
                    'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_UNRECOGNIZED_OPTION,
                    'message' => $msg
                ]);
            }
            $collationPageOptions['partialCollation'] = true;
        }
        
        return $this->getCollationTablePage($collationPageOptions, $response);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function automaticCollationPagePreset(Request $request, Response $response): Response
    {
        //$this->codeDebug('Preset request');
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $presetId = $request->getAttribute('preset');
        
        $presetManager = $this->systemManager->getPresetsManager();

        if (!$presetManager->presetExistsById($presetId)) {
            $msg = 'Preset not found';
            $this->logger->error($msg,
                    [ 'presetId' => $presetId]);
            
            return $this->renderPage($response, self::TEMPLATE_ERROR, [
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => '??',
                'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_UNKNOWN_PRESET,
                'message' => $msg
            ]);
        }

        $preset = $presetManager->getPresetById($presetId);
        $presetData = $preset->getData();
        $lang =  $presetData['lang'];
        $ignorePunctuation = $presetData['ignorePunctuation'];

        $presetUserName = $this->dataManager->userManager->getUserInfoByUserId($preset->getUserId())['fullname'];
        
        $collationPageOptions = [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'lang' => $lang,
            'ignorePunctuation' => $ignorePunctuation,
            'witnesses' => [], 
            'partialCollation' => false,
            'isPreset' => true,
            'preset' => [ 
                'id' => $preset->getId(), 
                'title' => $preset->getTitle(),
                'userId' => $preset->getUserId(),
                'userName' => $presetUserName,
                'editable' => ( intval($this->userInfo['id']) === $preset->getUserId())
            ]
        ];
        if (isset($presetData['normalizers'])) {
            $collationPageOptions = $presetData['normalizers'];
        }

         // get witnesses to include
        foreach ($presetData['witnesses'] as $presetId) {
            if (is_int($presetId)) {
                // old preset!
                $docId = intval($presetId);
                if ($docId !== 0) {
                    $collationPageOptions['witnesses'][] = [
                        'type' => WitnessType::FULL_TRANSCRIPTION,
                        'systemId' => WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, 'A'),
                    ];
                }
            } else {
                $fields = explode('-', $presetId);
                $witnessType = $fields[0];
                if ($witnessType !== WitnessType::FULL_TRANSCRIPTION) {
                    continue;
                }
                $docId = intval($fields[1]);
                $lwid = $fields[2];
                $collationPageOptions['witnesses'][] = [
                    'type' => WitnessType::FULL_TRANSCRIPTION,
                    'systemId' => WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $lwid)
                ];
            }
        }
        $collationPageOptions['partialCollation'] = true;

        return $this->getCollationTablePage($collationPageOptions, $response);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function automaticCollationPageCustom(Request $request, Response $response): Response
    {

        $this->codeDebug('automaticCollationPageCustom API call');
        $rawData = $request->getBody()->getContents();
        parse_str($rawData, $postData);
        $inputData = null;
        
        if (isset($postData['data'])) {
            $inputData = json_decode($postData['data'], true);
        }
        
        // Some checks
        if (is_null($inputData) ) {
            $this->logger->error('Automatic Collation Table:  no data in input',
                    [ 'rawdata' => $postData]);
            $msg = 'Bad request: no data';
            return $this->renderPage($response, self::TEMPLATE_ERROR, [
                'work' => '??',
                'chunk' => '??',
                'lang' => '??',
                'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_NO_DATA,
                'message' => $msg
            ]);
        }
        if (!isset($inputData['options'])) {
            $this->logger->error('Automatic Collation Table:  no options in input',
                    [ 'rawdata' => $postData]);
            $msg = 'Bad request: no options';
            return $this->renderPage($response, self::TEMPLATE_ERROR, [
                'work' => '??',
                'chunk' => '??',
                'lang' => '??',
                'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_NO_OPTIONS,
                'message' => $msg
            ]);
        }
        
        $collationPageOptions = $inputData['options'];
        $requiredFields = ['work', 'chunk', 'lang', 'ignorePunctuation', 'witnesses', 'partialCollation'];
        // 'normalizers' is not required, defaults to applying standard normalizers
        foreach ($requiredFields as $requiredField) {
            if (!isset($collationPageOptions[$requiredField])) {
                $msg = 'Bad request: missing required option ' . $requiredField ;
                return $this->renderPage($response, self::TEMPLATE_ERROR, [
                    'work' => '??',
                    'chunk' => '??',
                    'lang' => '??',
                    'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_MISSING_REQUIRED_OPTION,
                    'message' => $msg
                ]);
            }
        }
        $collationPageOptions['isPreset'] = false;

        //$this->codeDebug('Options', $collationPageOptions);
        
        return $this->getCollationTablePage($collationPageOptions, $response);
    }

    /**
     * @param array $collationPageOptions
     * @param Response $response
     * @return Response
     */
    private function getCollationTablePage(array $collationPageOptions, Response $response): Response
    {
//        $this->codeDebug("Getting collation table page", $collationPageOptions);

        $workId = $collationPageOptions['work'];
        $chunkNumber = intval($collationPageOptions['chunk']);
        $language = $collationPageOptions['lang'];
        $partialCollation = $collationPageOptions['partialCollation'];



        $apiCallOptions = [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'lang' => $language,
            'ignorePunctuation' => $collationPageOptions['ignorePunctuation'],
            'witnesses' => $collationPageOptions['witnesses']
        ];

        if (isset($collationPageOptions['normalizers'])) {
            $this->codeDebug("Custom normalizers", $collationPageOptions['normalizers']);
            $apiCallOptions['normalizers'] = $collationPageOptions['normalizers'];
        }

        $this->codeDebug('apiCallOptions', $apiCallOptions);
        $dm = $this->dataManager;
        $pageName = "AutomaticCollation-$workId-$chunkNumber-$language";
        
        $this->profiler->start();
        $warnings = [];

        
        // check that language is valid
        $languages = $this->languages;
        $langInfo = null;
        foreach($languages as $lang) {
            if ($lang['code'] === $language) {
                $langInfo = $lang;
            }
        }
        
        if (is_null($langInfo)) {
            $msg = 'Invalid language <b>' . $language . '</b>';
            return $this->renderPage($response, self::TEMPLATE_ERROR, [
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_INVALID_LANGUAGE,
                'message' => $msg
            ]);
        }
        
        // get work info
        $workInfo = $dm->getWorkInfo($workId);
        
        // get total witness counts
        $validWitnesses = $this->getValidWitnessesForChunkLang($workId, $chunkNumber, $language);

        //$this->codeDebug('Found ' . count($validWitnesses) . " valid witnesses");

        // put titles in fullTx witnesses that don't have one

        // TODO: Check this default
        $supressTimestampsInApiCalls = true;

        for($i = 0; $i < count($apiCallOptions['witnesses']); $i++) {
            if ($apiCallOptions['witnesses'][$i]['type'] === WitnessType::FULL_TRANSCRIPTION) {
                $systemId = $apiCallOptions['witnesses'][$i]['systemId'];
                $witnessInfo = WitnessSystemId::getFullTxInfo($systemId);
                $apiCallWitnessTxInfo = $witnessInfo->typeSpecificInfo;
                $found = false;
                foreach ($validWitnesses as $validWitnessInfo) {
                    $validWitnessFullTxInfo = $validWitnessInfo->typeSpecificInfo;
                    if ($validWitnessFullTxInfo['docId'] === $apiCallWitnessTxInfo['docId'] && $validWitnessFullTxInfo['localWitnessId'] === $apiCallWitnessTxInfo['localWitnessId']) {
                        $docInfo = $validWitnessFullTxInfo['docInfo'];
                        /** @var DocInfo $docInfo */
                        $title = $docInfo->title;
                        if ($validWitnessFullTxInfo['localWitnessId'] !== 'A') {
                            $title .= ' (' . $validWitnessFullTxInfo['localWitnessId'] . ')';
                        }
                        $apiCallOptions['witnesses'][$i]['title'] = $title;
                        // here would be a place to fix the timeStamp, but it's better to leave it blank
                        // so that the system automatically gets the current version
//                        if ($validWitnessFullTxInfo['timeStamp'] === '') {
//                            $supressTimestampsInApiCalls = true;
//                        }
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $msg = 'Requested witness not valid ' . $systemId;
                    return $this->renderPage($response, self::TEMPLATE_ERROR, [
                        'work' => $workId,
                        'chunk' => $chunkNumber,
                        'lang' => $language,
                        'errorSignature' => self::ERROR_SIGNATURE_PREFIX . self::ERROR_INVALID_WITNESS_ID,
                        'message' => $msg
                    ]);
                }
            }
        }

        $this->profiler->stop();
        $this->logProfilerData($pageName);
        
        $templateOptions = [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'lang' => $language,
            'apiCallOptions' => $apiCallOptions,
            'langName' => $langInfo['name'],
            'isPartial' => $partialCollation,
            'isPreset' => $collationPageOptions['isPreset'],
            'rtl' => $langInfo['rtl'],
            'work_info' => $workInfo,
            'num_docs' => $partialCollation ? count($apiCallOptions['witnesses']) : count($validWitnesses),
            'total_num_docs' => count($validWitnesses),
            'availableWitnesses' => $validWitnesses,
            'suppressTimestampsInApiCalls' => $supressTimestampsInApiCalls,
            'normalizerData' => $this->getNormalizerData($language, 'standard'),
            'warnings' => $warnings
        ];
        if ($templateOptions['isPreset']) {
            $templateOptions['preset'] = $collationPageOptions['preset'];
        }
        
        return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, $templateOptions);
    }
    

    /**
     * @param string $workId
     * @param int $chunkNumber
     * @param string $langCode
     * @return WitnessInfo[]
     */
    protected function getValidWitnessesForChunkLang(string $workId, int $chunkNumber, string $langCode) : array {
        $this->logger->debug("Getting valid witnesses for $workId, $chunkNumber, $langCode");
        $tm = $this->systemManager->getTranscriptionManager();

        $vw = $tm->getWitnessesForChunk($workId, $chunkNumber);

        $vWL = [];
        foreach($vw as $witnessInfo) {
            if ($witnessInfo->languageCode === $langCode && $witnessInfo->isValid) {
                $vWL[] = $witnessInfo;
            }
        }
        return $vWL;
    }
}
