<?php
/*
 * Copyright (C) 2016-2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace APM\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

use AverroesProject\Profiler\ApmProfiler;

use APM\Core\Witness\StringWitness;
use APM\Core\Collation\CollationTable;
use APM\Decorators\QuickCollationTableDecorator;
use AverroesProjectToApm\Decorators\TransitionalCollationTableDecorator;
use AverroesProjectToApm\ApUserDirectory;

/**
 * API Controller class
 *
 */
class ApiCollation extends ApiController
{
    const ERROR_NO_WITNESSES = 2000;
    const ERROR_NOT_ENOUGH_WITNESSES = 2001;
    const ERROR_BAD_WITNESS = 2002;
    const ERROR_FAILED_COLLATION_ENGINE_PROCESSING = 2003;
    const ERROR_INVALID_LANGUAGE = 2004;
    
    public function quickCollation(Request $request, 
            Response $response, $next)
    {
        $apiCall = 'quickCollation';
        $profiler = new ApmProfiler($apiCall, $this->db);
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['witnesses']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $witnesses = $inputData['witnesses'];
        if (count($witnesses) < 2) {
            $this->logger->error("Quick Collation: not enough witnessess in data, got " . count($witnesses),
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::ERROR_NOT_ENOUGH_WITNESSES,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_NOT_ENOUGH_WITNESSES]);
        }
        
        
        $collation = new CollationTable();
        
        // Check and get initial witness data
        foreach ($witnesses as $witness) {
            if (!isset($witness['id']) || !isset($witness['text'])) {
                $this->logger->error("Quick Collation: bad witness in data",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::ERROR_BAD_WITNESS,
                      'data' => $inputData ]);
                return $response->withStatus(409)->withJson( ['error' => self::ERROR_BAD_WITNESS]);
            }
            $sw =  new StringWitness('QuickCollation', 'no-chunk', $witness['text']);
            $collation->addWitness($witness['id'], $sw);
        }
        
        $collatexInput = $collation->getCollationEngineInput();
        
        $collationEngine = $this->ci->cr;
        
        // Run Collatex
        $collatexOutput = $collationEngine->collate($collatexInput);
        // @codeCoverageIgnoreStart
        // Not worrying about testing CollatexErrors here
        if ($collatexOutput === false) {
            $this->logger->error("Quick Collation: error running Collatex",
                        [ 'apiUserId' => $this->ci->userId, 
                        'apiError' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR,
                        'data' => $inputData, 
                        'collationEngineDetails' => $collationEngine->getRunDetails()
                    ]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR]);
        }
        // @codeCoverageIgnoreEnd
        
        try {
            $collation->setCollationTableFromCollationEngineOutput($collatexOutput);
        }
        // @codeCoverageIgnoreStart
        // Can't replicate this consistently in testing
        catch(\Exception $ex) {
            $this->logger->error('Error processing collatexOutput into collation object', 
                    [ 'apiUserId' => $this->ci->userId, 
                        'apiError' => self::ERROR_FAILED_COLLATION_ENGINE_PROCESSING,
                        'data' => $inputData, 
                         'collationEngineDetails' => $collationEngine->getRunDetails(),
                        'exceptionMessage' => $ex->getMessage()
                        ]);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_FAILED_COLLATION_ENGINE_PROCESSING]);
        }
        // @codeCoverageIgnoreEnd
        
        $decoratedCollationTable = (new QuickCollationTableDecorator())->decorate($collation);

        $profiler->log($this->logger);
        
        return $response->withJson([
            'collationEngineDetails' => $collationEngine->getRunDetails(), 
            'collationTable' => $decoratedCollationTable,
            'sigla' => $collation->getSigla()
            ]);
        
    }
    
    
    /**
     * Generates an automatic collation table from a POST request
     * 
     * the POST request must contain a 'data' field with the following
     * subfields:
     *  work :  work code (e.g., 'AW47')
     *  chunk:  chunk number
     *  lang:  language code, e.g., 'la', 'he'
     *  witnesses:  array of witness identifications, each element of
     *      the array must be of the form: 
     *          [ 'type' => <TYPE> , 'id' => <ID> ]
     *      where 
     *          <TYPE> is a valid witness type  (currently only 'doc'  is implemented)
     *          <ID> is the witness system id (normally relative to its type)
     *               e.g, a system document id.
     *      If the witnesses array is empty, all valid witnesses for the
     *      given work, chunk and language will be collated.
     * 
     * @param Request $request
     * @param Response $response
     * @param type $next
     * @return type
     */
    public function automaticCollation(Request $request, 
            Response $response, $next)
    {
        $db = $this->db;
        $apiCall = 'Collation';
        $requiredFields = [ 'work', 'chunk', 'lang', 'witnesses'];
        
        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }
        
        $workId = $inputDataObject['work'];
        $chunkNumber = $inputDataObject['chunk'];
        $language = $inputDataObject['lang'];
        $witnesses = $inputDataObject['witnesses'];
        $ignorePunctuation = isset($inputDataObject['ignorePunctuation']) ?
                $inputDataObject['ignorePunctuation'] : false;
        
        $profiler = new ApmProfiler("CollationTable-$workId-$chunkNumber-$language", $db);
        
        // Check language
        $languages = $this->ci->settings['languages'];
        $langInfo = null;
        foreach($languages as $lang) {
            if ($lang['code'] === $language) {
                $langInfo = $lang;
            }
        }
        
        if (is_null($langInfo)) {
            $msg = 'Invalid language <b>' . $language . '</b>';
            $this->logger->error($msg);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_INVALID_LANGUAGE, 'msg' => $msg]);
        }
        
        
        
        $workInfo = $db->getWorkInfo($workId);
        
        // Eventually, instead of just the docs for a chunk, we'll need
        // to get a true list of witnesses, including, for example, derivative
        // witnesses, text, etc.
        $validWitnessLocations = $this->getValidWitnessLocationsForWorkChunkLang($db, $workId, $chunkNumber, $language);
        if (count($validWitnessLocations) < 2) {
            $msg = 'Not enough valid witnesses to collate';
            $this->logger->error($msg, $validWitnessLocations);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_NOT_ENOUGH_WITNESSES, 'msg' => $msg]);
        }
        
        $witnessesToInclude = [];
        $partialCollation = false;
        
        if (count($witnesses) !== 0) {
            foreach ($witnesses as $witness) {
                // for the time being, actually, there is only 'doc' type witnesses
                $witnessType = isset($witness['type']) ? $witness['type'] : 'doc';
                $witnessId = isset($witness['id']) ? intVal($witness['id']) : 0;
                if ($witnessId !== 0 && isset($validWitnessLocations[$witnessId])) {
                    $witnessesToInclude[$witnessId] = $validWitnessLocations[$witnessId];
                }
            }
            $partialCollation = true;
            $this->ci->logger->debug('Partial collation', $witnessesToInclude);
            if (count($witnessesToInclude) < 2) {
                $msg = 'Error in partial collation table request: need at least 2 witnesses to collate, got only ' . count($witnessesToInclude) . '.';
                $this->logger->error($msg, $witnessesToInclude);
                return $response->withStatus(409)->withJson( ['error' => self::ERROR_NOT_ENOUGH_WITNESSES, 'msg' => $msg]);
            }
        }
        
        if (!$partialCollation) {
            $witnessesToInclude = $validWitnessLocations;
        }
        
        $profiler->lap('Checks done');
        
        $collationTable = new CollationTable($ignorePunctuation);
        $itemIds = [];
        foreach ($witnessesToInclude as $id => $witnessLocation)  {
            // Get the AverroesProject item streams
            $segmentStreams = [];
            foreach($witnessLocation as $segLocation) {
                $apItemStream = $db->getItemStreamBetweenLocations($id, $segLocation['start'], $segLocation['end']);
                foreach($apItemStream as $row) {
                    $itemIds[] = (int) $row['id'];
                }
                $segmentStreams[] = $apItemStream;
            }
            $edNoteArrayFromDb = $db->enm->rawGetEditorialNotesForListOfItems($itemIds);
            $itemStream = new \AverroesProjectToApm\ItemStream($id, $segmentStreams, $language, $edNoteArrayFromDb);
            $itemStrWitness = new \AverroesProjectToApm\ItemStreamWitness($workId, $chunkNumber, $itemStream);
            $docData = $db->getDocById($id);
            $collationTable->addWitness($docData['title'], $itemStrWitness);
        }
        
        $profiler->lap('Collation table built');
        $collatexInput = $collationTable->getCollationEngineInput();
        
        $profiler->lap('Collatex input built');
        $collationEngine = $this->ci->cr;
        
        // Run Collatex
        $collatexOutput = $collationEngine->collate($collatexInput);
        // @codeCoverageIgnoreStart
        // Not worrying about testing CollatexErrors here
        if ($collatexOutput === false) {
            $msg = "Automatic Collation: error running Collation Engine";
            $this->logger->error($msg,
                        [ 'apiUserId' => $this->ci->userId, 
                        'apiError' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR,
                        'data' => $collatexInput, 
                        'collationEngineDetails' => $collationEngine->getRunDetails()
                    ]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR, 'msg' => $msg]);
        }
        // @codeCoverageIgnoreEnd
        
        $profiler->lap('Collatex done');
        try {
            $collationTable->setCollationTableFromCollationEngineOutput($collatexOutput);
        }
        // @codeCoverageIgnoreStart
        // Can't replicate this consistently in testing
        catch(\Exception $ex) {
            $msg = 'Error processing collation Engine output into collation object';
            $this->logger->error($msg, 
                    [ 'apiUserId' => $this->ci->userId, 
                        'apiError' => self::ERROR_FAILED_COLLATION_ENGINE_PROCESSING,
                        'data' => $inputData, 
                         'collationEngineDetails' => $collationEngine->getRunDetails(),
                        'exceptionMessage' => $ex->getMessage()
                        ]);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_FAILED_COLLATION_ENGINE_PROCESSING]);
        }
        // @codeCoverageIgnoreEnd
        
        $profiler->lap('Collation table built from collatex output');
        $userDirectory = new ApUserDirectory($db->um);
        $decorator = new TransitionalCollationTableDecorator($userDirectory);
        $decoratedCollationTable = $decorator->decorate($collationTable);

        $profiler->log($this->logger);
        
        $collationEngineDetails = $collationEngine->getRunDetails();
        $collationEngineDetails['totalDuration'] =  $profiler->getTotalTime() / 1000;
        
        return $response->withJson([
            'collationEngineDetails' => $collationEngineDetails, 
            'collationTable' => $decoratedCollationTable,
            'sigla' => $collationTable->getSigla()
            ]);

    }
    
    
    protected function getValidWitnessLocationsForWorkChunkLang($db, $workId, $chunkNumber, $language) : array {
        $witnessList = $db->getDocsForChunk($workId, $chunkNumber);
        
        $witnessesForLang = [];
        
        foreach($witnessList as $witness) {
            $docInfo = $db->getDocById($witness['id']);
            if ($docInfo['lang'] !== $language) {
                // not the right language
                continue;
            }
            $locations = $db->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
            if (count($locations)===0) {
                // No data for this witness, this would only happen
                // if somebody erased the chunk marks from the document
                // in the few milliseconds between getDocsForChunk() and 
                // getChunkLocationsForDoc() 
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
            $witnessesForLang[$witness['id']] = $locations;
        }
        return $witnessesForLang;
    }
}
