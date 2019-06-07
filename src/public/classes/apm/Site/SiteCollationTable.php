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

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

use AverroesProject\Profiler\ApmProfiler;

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
    
    const TEMPLATE_ERROR = 'chunk.collation.error.twig';
    const TEMPLATE_QUICK_COLLATION = 'apm/collation.quick.twig';
    const TEMPLATE_COLLATION_TABLE = 'apm/collationtable.twig';
    
    
    public function quickCollationPage(Request $request, Response $response, $next)
    {
        return $this->renderPage($response, self::TEMPLATE_QUICK_COLLATION, [
            'contactName' => $this->config['support_contact_name'],
            'contactEmail' => $this->config['support_contact_email']
        ]);

    }
    
    public function automaticCollationPageGet(Request $request, Response $response, $args) 
    {
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
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
            'isPreset' => 0
        ];
         // get witnesses to include
        if (isset($args['docs'])) {
            $docsInArgs = explode('/', $args['docs']);
            foreach ($docsInArgs as $docId) {
                $docId = intval($docId);
                if ($docId !== 0) {
                    $collationPageOptions['witnesses'][] = ['type' => 'doc', 'id' => $docId];
                }
            }
            $collationPageOptions['partialCollation'] = true;
        }
        
        return $this->getCollationTablePage($collationPageOptions, $response);
    }
    
    public function automaticCollationPagePreset(Request $request, Response $response, $args) 
    {
        $this->logger->debug('Preset');
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $presetId = $request->getAttribute('preset');
        
        $presetManager = $this->systemManager->getPresetsManager();
        
        $preset = $presetManager->getPresetById($presetId);
        
        if ($preset === false) {
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
        
        $presetData = $preset->getData();
        $lang =  $presetData['lang'];
        $ignorePunctuation = $presetData['ignorePunctuation'];
        
        $presetUserName = $this->dataManager->um->getUserInfoByUserId($preset->getUserId())['fullname'];
        
        $collationPageOptions = [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'lang' => $lang,
            'ignorePunctuation' => $ignorePunctuation,
            'witnesses' => [], 
            'partialCollation' => false,
            'isPreset' => 1,
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
    
    public function automaticCollationPageCustom(Request $request, Response $response, $args)  {
        
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
        
        $collationPageOptions['isPreset'] = 0;
        
        return $this->getCollationTablePage($collationPageOptions, $response);
    }
    
    private function getCollationTablePage($collationPageOptions, Response $response) {
        $workId = $collationPageOptions['work'];
        $chunkNumber = $collationPageOptions['chunk'];
        $language = $collationPageOptions['lang'];
        $partialCollation = $collationPageOptions['partialCollation'];
       
        
        $apiCallOptions = [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'lang' => $language,
            'ignorePunctuation' => $collationPageOptions['ignorePunctuation'],
            'witnesses' => $collationPageOptions['witnesses']
        ];
        
        $dm = $this->dataManager;
        
        $profiler = new ApmProfiler("AutomaticCollation-$workId-$chunkNumber-$language", $dm);
        $this->logger->debug('Automatic collation', [ 'options' => $collationPageOptions]);
        $warnings = [];

        
        // check that language is valid
        $languages = $this->config['languages'];
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
        $validWitnesses = $this->getValidWitnessDocIdsForWorkChunkLang($dm, $workId, $chunkNumber, $language);
        $availableWitnesses = [];
        foreach($validWitnesses as $witnessId) {
            $docInfo = $dm->getDocById($witnessId);
            $availableWitnesses[] = [ 'type' => 'doc', 'id' => intVal($witnessId), 'title' => $docInfo['title']];
        }
        
        $canViewExperimentalData = 1;
//        if ($dm->um->isUserAllowedTo($this->userInfo['id'], 'act-view-experimental-data')) {
//            $canViewExperimentalData = 1;
//        }
        
        
        $profiler->log($this->logger);
        
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
            'availableWitnesses' => $availableWitnesses,
            'canViewExperimentalData' => $canViewExperimentalData,
            'warnings' => $warnings
        ];
        if ($templateOptions['isPreset']) {
            $templateOptions['preset'] = $collationPageOptions['preset'];
        }
        
        return $this->renderPage($response, self::TEMPLATE_COLLATION_TABLE, $templateOptions);
    }
    
    protected function getValidWitnessDocIdsForWorkChunkLang($dm, $workId, $chunkNumber, $language) : array {
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
}
