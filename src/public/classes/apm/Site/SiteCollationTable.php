<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
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

use APM\FullTranscription\ApmChunkSegmentLocation;
use APM\System\WitnessType;
use AverroesProject\Data\DataManager;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
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
    const ERROR_SIGNATURE_PREFIX = 'CollationTableError_8kn7KjcyAp_';
    
    const ERROR_NO_DATA = 'NoData';
    const ERROR_NO_OPTIONS = 'NoOptions';
    const ERROR_MISSING_REQUIRED_OPTION = 'MissingRequiredOption';
    const ERROR_UNKNOWN_PRESET = 'UnknownPreset';
    const ERROR_INVALID_LANGUAGE = 'InvalidLanguage';
    const ERROR_INVALID_WITNESS_TYPE = 'InvalidWitnessType';
    const ERROR_INVALID_WITNESS_ID = 'InvalidWitnessId';
    const ERROR_UNRECOGNIZED_OPTION = 'UnrecognizedOption';
    
    const TEMPLATE_ERROR = 'chunk.collation.error.twig';
    const TEMPLATE_QUICK_COLLATION = 'collation.quick.twig';
    const TEMPLATE_COLLATION_TABLE = 'collationtable.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function quickCollationPage(Request $request, Response $response)
    {
        return $this->renderPage($response, self::TEMPLATE_QUICK_COLLATION, [
            'contactName' => $this->config['support_contact_name'],
            'contactEmail' => $this->config['support_contact_email']
        ]);

    }

    /**
     * @param Request $request
     * @param Response $response
     * @param $args
     * @return Response
     */
    public function automaticCollationPageGet(Request $request, Response $response, $args) 
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
                            'lwid' => 'A'
                        ];
                    }
                    continue;
                }
                $specs = explode('-', $argWitnessSpec);
                if (count($specs) >= 2) {
                    $witnessType = $specs[0];
                    if (!WitnessType::isValid($witnessType)) {
                        $msg = 'Invalid witness type given: ' . $witnessType;
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
                        'lwid' => $lwid
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
    public function automaticCollationPagePreset(Request $request, Response $response)
    {
        $this->logger->debug('Preset');
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

         // get witnesses to include
        foreach ($presetData['witnesses'] as $docId) {
            $docId = intval($docId);
            if ($docId !== 0) {
                $collationPageOptions['witnesses'][] = ['type' => 'doc', 'id' => $docId];
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
    public function automaticCollationPageCustom(Request $request, Response $response)  {
        
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
        
        return $this->getCollationTablePage($collationPageOptions, $response);
    }

    /**
     * @param $collationPageOptions
     * @param Response $response
     * @return Response
     */
    private function getCollationTablePage($collationPageOptions, Response $response) {
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

        $this->logger->debug('Site ACT: apiCallOptions', $apiCallOptions);
        $dm = $this->dataManager;
        $pageName = "AutomaticCollation-$workId-$chunkNumber-$language";
        
        $this->profiler->start();
        $this->logger->debug('Automatic collation', [ 'options' => $collationPageOptions]);
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
        $validWitnesses2 = $this->getValidWitnessesForChunkLang($workId, $chunkNumber, $language);
        $this->logger->debug('Valid witnesses 2', $validWitnesses2);
        $validWitnesses = $this->getValidWitnessDocIdsForWorkChunkLang($dm, $workId, $chunkNumber, $language);
        $availableWitnesses = [];
        foreach($validWitnesses as $witnessId) {
            $docInfo = $dm->getDocById($witnessId);
            $availableWitnesses[] = [ 'type' => 'doc', 'id' => intVal($witnessId), 'title' => $docInfo['title']];
        }
        $this->logger->debug('Valid witnesses', $validWitnesses);
        $this->logger->debug('Valid witnesses 2', $validWitnesses2);

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
            'num_docs' => $partialCollation ? count($apiCallOptions['witnesses']) : count($validWitnesses2),
            'total_num_docs' => count($validWitnesses2),
            'availableWitnesses' => $availableWitnesses,
            'availableWitnessesNew' => $validWitnesses2,
            'warnings' => $warnings
        ];
        if ($templateOptions['isPreset']) {
            $templateOptions['preset'] = $collationPageOptions['preset'];
        }
        
        return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, $templateOptions);
    }
    
    protected function getValidWitnessDocIdsForWorkChunkLang(DataManager $dm, $workId, $chunkNumber, $language) : array {
        $witnessList = $dm->getDocsForChunk($workId, $chunkNumber);
        
        $witnessesForLang = [];
        
        foreach($witnessList as $witness) {
            $docInfo = $dm->getDocById($witness['id']);
            if ($docInfo['lang'] !== $language) {
                // not the right language
                continue; 
            }
            $locations = $dm->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
            if (count($locations)===0) {
                // No data for this witness, normally this should not happen
                continue; // @codeCoverageIgnore
            }
            // Check if there's an invalid segment
            $invalidSegment = false;
            foreach($locations as $segment) {
                if (!$segment['valid']) {
                    $invalidSegment = true;
                    break;
                }
            }
            if ($invalidSegment) {
                continue; // nothing to do with this witness
            }
            $witnessesForLang[] = $witness['id'];
        }
        return $witnessesForLang;
    }

    protected function getValidWitnessesForChunkLang(string $workId, int $chunkNumber, string $langCode) : array {
        $this->logger->debug("Getting valid witnesses for $workId, $chunkNumber, $langCode");
        $tm = $this->systemManager->getTranscriptionManager();

        $map = $tm->getChunkLocationMapForChunk($workId, $chunkNumber, TimeString::now());

        $docArray = $map[$workId][$chunkNumber];
        $witnesses = [];

        foreach($docArray as $docId => $localWitnessIdArray) {
            $docInfo = $tm->getDocManager()->getDocInfoById($docId);
            if ($docInfo->languageCode !== $langCode) {
                $this->logger->debug("$docId is not $langCode");
                continue;
            }
            foreach($localWitnessIdArray as $lwid => $segmentArray) {
                $isValid = true;
                foreach($segmentArray as $segmentNumber => $segment) {
                    /** @var $segment ApmChunkSegmentLocation */
                    if (!$segment->isValid()) {
                        $this->logger->debug("Doc $docId, lwid $lwid, segment $segmentNumber is not valid");
                        $isValid = false;
                    }
                }
                if ($isValid) {
                    $title = $docInfo->title;
                    if ($lwid !== 'A') {
                        $title .= ' (' . $lwid . ')';
                    }
                    $witnesses[] = [
                        'type' => WitnessType::FULL_TRANSCRIPTION,
                        'docId' => $docId,
                        'lwid' => $lwid,
                        'title' => $title,
                        'langCode' => $langCode
                    ];
                }
            }
        }
        return $witnesses;

    }
}
