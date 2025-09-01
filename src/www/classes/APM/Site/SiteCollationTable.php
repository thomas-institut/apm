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
use APM\CollationTable\CtData;
use APM\System\Document\DocInfo;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Person\PersonNotFoundException;
use APM\System\User\UserNotFoundException;
use APM\System\WitnessInfo;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use APM\System\Work\WorkNotFoundException;
use APM\ToolBox\HttpStatus;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\TimeString\TimeString;


/**
 * Site Controller class
 *
 */
class SiteCollationTable extends SiteController
{
    // This will be added to the error pages within an HTML comment so
    // that unit testing can check that the right error pages are 
    // generated
    const string ERROR_SIGNATURE_PREFIX = 'CollationTableError_8kn7KjcyAp_';
    
    const string ERROR_NO_DATA = 'NoData';
    const string ERROR_NO_OPTIONS = 'NoOptions';
    const string ERROR_MISSING_REQUIRED_OPTION = 'MissingRequiredOption';
    const string ERROR_UNKNOWN_PRESET = 'UnknownPreset';

    public function newChunkEdition(Request $request, Response $response) : Response{
        
        $workId  = $request->getAttribute('workId');
        $chunkNumber = $request->getAttribute('chunkNumber');
        $lang = $request->getAttribute('lang');
        if ($workId === null || $chunkNumber === null || $lang === null) {
            return $this->getBasicErrorPage($response, "Error", "Invalid parameters for new chunk edition creation", HttpStatus::BAD_REQUEST);
        }
        $this->logger->debug("New Chunk Edition, $workId-$chunkNumber, language = $lang");

        $ctData = $this->systemManager->getCollationTableManager()->getEmptyChunkEdition($workId, $chunkNumber, $lang, "New Chunk Edition");

        try {
            $workInfo = $this->systemManager->getWorkManager()->getWorkDataByDareId($workId);
        } catch (WorkNotFoundException) {
//          Not found!!!
            return $this->getBasicErrorPage(
                $response,
                "Error",
                "Work '$workId' not defined in the system", 404);
        }

        $peopleIds = [];
        $peopleIds[] = $workInfo->authorId;
        $pm = $this->systemManager->getPersonManager();
        $peopleInfo = [];
        foreach($peopleIds as $personId) {
            try {
                $personData = $pm->getPersonEssentialData($personId);
            } catch (PersonNotFoundException) {
                $this->logger->error("Person $personId mentioned in CT not found");
            }
            if (isset($personData)) {
                $peopleInfo[$personId] = $personData->getExportObject();
            }
        }

        return $this->renderStandardPage(
            $response,
            '',
            'Edit Collation Table',
            'EditionComposer',
            'js/EditionComposer/EditionComposer.js',
            [
                'workId' => $workId,
                'chunkNumber' => intval($chunkNumber),
                'tableId' => -1,
                'collationTableData' => $ctData,
                'workInfo' => $workInfo,
                'peopleInfo' => $peopleInfo,
                'docInfo' => [],
                'versionInfo' => [],
                'isTechSupport' => $this->systemManager->getUserManager()->isRoot($this->userId),
                'versionId' => -1,
                'lastVersion' => true
            ],
            [],
            [
                'collationtable.css',
                'multi-panel-ui/styles.css',
                'edition-composer.css',
                'collation.edit.css'
            ],
            [ 'js/SimpleProfiler.js']
        );

    }


    /**
     * Serves the collation table editor.
     * The collation table editor handles both saved collation tables and chunk editions,
     * the difference is made by the JS application
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException|DocumentNotFoundException
     */
    public function editCollationTable(Request $request, Response $response) : Response{
        $tableId = intval($request->getAttribute('tableId'));
        $versionId = intval($request->getAttribute('versionId'));

        
        $this->logger->debug("Edit collation table id $tableId, version $versionId");
        $ctManager = $this->systemManager->getCollationTableManager();
        $versionInfoArray = $ctManager->getCollationTableVersions($tableId);


        if (count($versionInfoArray) === 0) {
            $this->logger->info("No version info found, table probably does not exist");
            $versionId = 0;
        }
        $timeStamp = TimeString::now();
        $isLastVersion = true;
        if ($versionId !== 0) {
            // find timestamp for given versionId
            $found = false;
            foreach ( $versionInfoArray as $versionInfo) {
                if ($versionInfo->id == $versionId) {
                    $timeStamp = $versionInfo->timeFrom;
                    if ($versionInfo->timeUntil !== TimeString::END_OF_TIMES) {
                        $isLastVersion = false;
                    }
                    $found = true;
                    $this->logger->debug("Version timestamp: $timeStamp");
                    break;
                }
            }
            if (!$found) {
                $this->logger->info("Version ID does exist or does not correspond to given table, defaulting to latest version");
            }
        }

        if ($isLastVersion) {
            // find version Id
            foreach ( $versionInfoArray as $versionInfo) {
                if ($versionInfo->timeUntil === TimeString::END_OF_TIMES) {
                    $versionId = $versionInfo->id;
                    break;
                }
            }
        }

        try {
            $ctData = $ctManager->getCollationTableById($tableId, $timeStamp);
        } catch (InvalidArgumentException) {
            $this->logger->info("Table $tableId requested for editing not found");
            return $this->getErrorPage($response, 'Collation Table Error', "Table $tableId not found", HttpStatus::NOT_FOUND);
        }

        $versionInfoArray = $ctManager->getCollationTableVersions($tableId);
        $chunkId = $ctData['chunkId'] ?? $ctData['witnesses'][0]['chunkId'];
        [ $workId, $chunkNumber] = explode('-', $chunkId);
        try {
            $workInfo = $this->systemManager->getWorkManager()->getWorkDataByDareId($workId);
        } catch (WorkNotFoundException) {
//          Not found!!!
            return $this->getBasicErrorPage(
                $response,
                "Error",
                "Work '$workId' not defined in the system", 404);
        }


        $peopleTids = [];
        $peopleTids[] = $workInfo->authorId;
        $peopleTids = array_merge($peopleTids, $this->getMentionedAuthorsFromCtData($ctData));
        $peopleTids = array_merge($peopleTids, $this->getMentionedPeopleFromVersionArray($versionInfoArray));
        $pm = $this->systemManager->getPersonManager();
        $peopleInfo = [];
        foreach($peopleTids as $personTid) {

            try {
                $personData = $pm->getPersonEssentialData($personTid);
            } catch (PersonNotFoundException) {
                $this->logger->error("Person $personTid mentioned in CT not found");
            }
            if (isset($personData)) {
                $peopleInfo[$personTid] = $personData->getExportObject();
            }
        }

        $docs = $this->getMentionedDocsFromCtData($ctData);
        $docManager = $this->systemManager->getDocumentManager();
        $docInfoArray  = array_map( function ($id) use ($docManager) {
            return $docManager->getDocInfo($id);
        }, $docs);

        return $this->renderStandardPage(
            $response,
            '',
            'Edit Collation Table',
            'EditionComposer',
            'js/EditionComposer/EditionComposer.ts',
            [
                'workId' => $workId,
                'chunkNumber' => intval($chunkNumber),
                'tableId' => $tableId,
                'collationTableData' => $ctData,
                'workInfo' => $workInfo,
                'peopleInfo' => $peopleInfo,
                'docInfo' => $docInfoArray,
                'versionInfo' => $versionInfoArray,
                'isTechSupport' => $this->systemManager->getUserManager()->isRoot($this->userId),
                'versionId' => $versionId,
                'lastVersion' => $isLastVersion
            ],
            [],
            [
                '../node_modules/quill/dist/quill.core.css',
                'collationtable.css',
                'multi-panel-ui/styles.css',
                'edition-composer.css',
                'collation.edit.css'
            ],
            [ 'js/SimpleProfiler.js']
        );

//        if ($ctData['type'] === 'edition') {
//            return $this->renderStandardPage(
//              $response,
//              '',
//              'Edit Collation Table',
//              'EditionComposer',
//              'js/EditionComposer/EditionComposer.js',
//                [
//                  'workId' => $workId,
//                  'chunkNumber' => intval($chunkNumber),
//                  'tableId' => $tableId,
//                  'collationTableData' => $ctData,
//                  'workInfo' => $workInfo,
//                  'peopleInfo' => $peopleInfo,
//                  'docInfo' => $docInfoArray,
//                  'versionInfo' => $versionInfoArray,
//                  'isTechSupport' => $this->systemManager->getUserManager()->isRoot($this->userId),
//                  'versionId' => $versionId,
//                  'lastVersion' => $isLastVersion
//                ],
//                [],
//                [
//                    '../node_modules/quill/dist/quill.core.css',
//                    'collationtable.css',
//                    'multi-panel-ui/styles.css',
//                    'edition-composer.css',
//                    'collation.edit.css'
//                ],
//                [ 'js/SimpleProfiler.js']
//            );
//        } else {
//            return $this->renderStandardPage(
//                $response,
//                '',
//                'Edit Collation Table',
//                'CollationTableEditor',
//                'js/pages/CollationTableEditor.js',
//                [
//                    'workId' => $workId,
//                    'chunkNumber' => intval($chunkNumber),
//                    'tableId' => $tableId,
//                    'collationTableData' => $ctData,
//                    'workInfo' => $workInfo,
//                    'peopleInfo' => $peopleInfo,
//                    'docInfo' => $docInfoArray,
//                    'versionInfo' => $versionInfoArray,
//                ],
//                [],
//                [
//                    'collationtable.css',
//                    'collation.edit.css'
//                ],
//                [ 'js/SimpleProfiler.js']
//            );
//        }
    }

    protected function getMentionedPeopleFromVersionArray($versionArray) : array {
        $people = [];
        foreach($versionArray as $version) {
            /** @var CollationTableVersionInfo $version */
            $people[] = $version->authorTid;
        }
        return $people;
    }

    protected function getMentionedAuthorsFromCtData(array $ctData) : array {
        $authors = [];

        foreach($ctData['witnesses'] as $witness) {
            if ($witness['witnessType'] === WitnessType::FULL_TRANSCRIPTION) {
                foreach($witness['items']  as $i => $item) {
                    if (isset($item['notes'])) {
                        $this->logger->debug("Found notes in witness " . $witness['ApmWitnessId'] . ", item $i");
                        foreach($item['notes'] as $note) {
                            $authors[] = $note['authorTid'] ?? $note['authorId'] ;
                        }
                    }
                }
            }
        }

        return $authors;
    }

    protected function getMentionedDocsFromCtData(array $ctData) : array {
        return CtData::getMentionedDocsFromCtData($ctData);
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
                    // it defaults to a full transcription with local witness id 'A'
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
                        return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//                        return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                            'work' => $workId,
//                            'chunk' => $chunkNumber,
//                            'lang' => $language,
//                            'error' => true,
//                            'errorMessage' => $msg
//                        ]);
                    }
                    // for now, only full transcriptions are implemented, so the second field in
                    // the witness spec must be a number
                    if (!ctype_digit($specs[1])) {
                        $msg = 'Invalid doc id given: ' . $specs[1];
                        $this->logger->error($msg, [ 'args' => $args]);
                        return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//                        return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                            'work' => $workId,
//                            'chunk' => $chunkNumber,
//                            'lang' => $language,
//                            'error' => true,
//                            'errorMessage' => $msg
//                        ]);
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
                return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//                return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                    'work' => $workId,
//                    'chunk' => $chunkNumber,
//                    'lang' => $language,
//                    'error' => true,
//                    'errorMessage' => $msg
//                ]);
            }
            $collationPageOptions['partialCollation'] = true;
        }
        
        return $this->getCollationTablePage($collationPageOptions, $response);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws PersonNotFoundException
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
            return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//            return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                'work' => $workId,
//                'chunk' => $chunkNumber,
//                'lang' => '??',
//                'error' => true,
//                'errorMessage' => $msg
//            ]);
        }

        $preset = $presetManager->getPresetById($presetId);
        $presetData = $preset->getData();
        $lang =  $presetData['lang'];
        $ignorePunctuation = $presetData['ignorePunctuation'];


        $presetUserName = $this->systemManager->getPersonManager()->getPersonEssentialData($preset->getUserId())->name;
        
        $collationPageOptions = [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'lang' => $lang,
            'ignorePunctuation' => $ignorePunctuation,
            'witnesses' => [], 
            'partialCollation' => false,
            'isPreset' => true,
            'preset' => [ 
                'id' => $preset->getPresetId(),
                'title' => $preset->getTitle(),
                'userTid' => $preset->getUserId(),
                'userName' => $presetUserName,
                'editable' =>  $this->userId === $preset->getUserId()
            ]
        ];
        if (isset($presetData['normalizers'])) {
            $collationPageOptions = $presetData['normalizers'];
        }

         // get witnesses to include
        foreach ($presetData['witnesses'] as $presetId) {
            if (is_int($presetId)) {
                // old preset!
                $docId = $presetId;
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
            return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//            return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                'work' => '??',
//                'chunk' => '??',
//                'lang' => '??',
//                'error' => true,
//                'errorMessage' => $msg
//            ]);
        }
        if (!isset($inputData['options'])) {
            $this->logger->error('Automatic Collation Table:  no options in input',
                    [ 'rawdata' => $postData]);
            $msg = 'Bad request: no options';
            return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//            return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                'work' => '??',
//                'chunk' => '??',
//                'lang' => '??',
//                'error' => true,
//                'errorMessage' => $msg
//            ]);
        }
        
        $collationPageOptions = $inputData['options'];
        $requiredFields = ['work', 'chunk', 'lang', 'ignorePunctuation', 'witnesses', 'partialCollation'];
        // 'normalizers' is not required, defaults to applying standard normalizers
        foreach ($requiredFields as $requiredField) {
            if (!isset($collationPageOptions[$requiredField])) {
                $msg = 'Bad request: missing required option ' . $requiredField ;
                return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//                return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                    'work' => '??',
//                    'chunk' => '??',
//                    'lang' => '??',
//                    'error' => true,
//                    'errorMessage' => $msg
//                ]);
            }
        }
        $collationPageOptions['isPreset'] = false;
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

        $pageName = "AutomaticCollation-$workId-$chunkNumber-$language";
        
        
        $warnings = [];

        
        // check that language is valid
        $languages = $this->getLanguages();
        $langInfo = null;
        foreach($languages as $lang) {
            if ($lang['code'] === $language) {
                $langInfo = $lang;
            }
        }
        
        if (is_null($langInfo)) {
            $msg = 'Invalid language <b>' . $language . '</b>';
            return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//            return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                'work' => $workId,
//                'chunk' => $chunkNumber,
//                'lang' => $language,
//                'error' => true,
//                'errorMessage' => $msg
//            ]);
        }
        
        // get work info
        try {
            $workInfo = $this->systemManager->getWorkManager()->getWorkDataByDareId($workId);
        } catch (WorkNotFoundException) {
            return $this->getBasicErrorPage($response, 'Error', "Work $workId not found", 404);
        }

        // get total witness counts
        $validWitnesses = $this->getValidWitnessesForChunkLang($workId, $chunkNumber, $language);

        //$this->codeDebug('Found ' . count($validWitnesses) . " valid witnesses");

        // put titles in fullTx witnesses that don't have one

        // TODO: Check this default
        $suppressTimestampsInApiCalls = true;

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
//                            $suppressTimestampsInApiCalls = true;
//                        }
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $msg = 'Requested witness not valid ' . $systemId;
                    return $this->getErrorPage($response, 'Auto Collation', $msg, HttpStatus::BAD_REQUEST);
//                    return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, [
//                        'work' => $workId,
//                        'chunk' => $chunkNumber,
//                        'lang' => $language,
//                        'error' => true,
//                        'errorMessage' => $msg
//                    ]);
                }
            }
        }

        $data = [
            'workId' => $workId,
            'chunkNumber' => $chunkNumber,
            'lang' => $language,
            'initialApiOptions' => $apiCallOptions,
            'langName' => $langInfo['name'],
            'isPartial' => $partialCollation,
            'isPreset' => $collationPageOptions['isPreset'],
            'availableWitnesses' => $validWitnesses,
            'suppressTimestampsInApiCalls' => $suppressTimestampsInApiCalls,
            'normalizerData' => $this->getNormalizerData($language, 'standard'),
            'loadNow' => true
        ];
        if ($data['isPreset']) {
            $data['preset'] = $collationPageOptions['preset'];
        }
        $title = "ACT $workId-$chunkNumber-$language";
        if ($partialCollation) {
            $title .= '-partial';
        }

        return $this->renderStandardPage(
            $response,
            '',
            $title,
            'AutomaticCollationTable',
            'js/pages/AutomaticCollationTable/AutomaticCollationTable.ts',
            $data,
            [],
            ['collationtable.css', 'act-settingsform.css'],
//            ['js/SimpleProfiler.js']
        );


        
//        return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, $data);
    }
    

    /**
     * @param string $workId
     * @param int $chunkNumber
     * @param string $langCode
     * @return WitnessInfo[]
     */
    protected function getValidWitnessesForChunkLang(string $workId, int $chunkNumber, string $langCode) : array {
//        $this->logger->debug("Getting valid witnesses for $workId, $chunkNumber, $langCode");
        $tm = $this->systemManager->getTranscriptionManager();
        $vw = $tm->getWitnessesForChunk($workId, $chunkNumber);
        $langId = $this->systemManager->getLangIdFromCode($langCode);
        if ($langId === null) {
            $this->logger->error("Invalid language code '$langCode'");
            return [];
        }

        $vWL = [];
        foreach($vw as $witnessInfo) {
//            $this->logger->debug("Witness for chunk $witnessInfo->chunkNumber, testing langId $langId",
//            [ 'lang' => $witnessInfo->language, 'isValid' => $witnessInfo->isValid]);
            if ($witnessInfo->language === $langId && $witnessInfo->isValid) {
                $vWL[] = $witnessInfo;
            }

        }
        $numWitnesses = count($vWL);
        $this->logger->debug("There are $numWitnesses available witnesses for $workId, $chunkNumber, $langCode");
        return $vWL;
    }
}
