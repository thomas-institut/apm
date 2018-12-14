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
use AverroesProject\ItemStream\ItemStream;

use APM\Core\Witness\StringWitness;
use APM\Core\Collation\CollationTable;
use APM\Decorators\QuickCollationTableDecorator;

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
        
        $profiler = new ApmProfiler("CollationTable-$workId-$chunkNumber-$language", $db);
        $workInfo = $db->getWorkInfo($workId);
        
        // Eventually, instead of just the docs for a chunk, we'll need
        // to get a true list of witnesses, including, for example, derivative
        // witnesses, text, etc.
        $witnessList = $db->getDocsForChunk($workId, $chunkNumber);
        
        $witnessesToInclude = [];
        $partialCollation = false;
        
        if (count($witnesses) !== 0) {
            foreach ($witnesses as $witness) {
                // for the time being, actually, there is only 'doc' type witnesses
                $witnessType = isset($witness['type']) ? $witness['type'] : 'doc';
                $witnessId = intVal($witness['id']);
                if ($witnessId !== 0) {
                    $witnessesToInclude[] = $witnessId;
                }
            }
            $partialCollation = true;
            $this->ci->logger->debug('Partial collation', $witnessesToInclude);
            if (count($witnessesToInclude) < 2) {
                $msg = 'Error in partial collation table request: need at least 2 witnesses to collate, got only ' . count($witnessesToInclude) . '.';
                $this->logger->error($msg, $witnessesToInclude);
                return $response->withStatus(409)->withJson( ['error' => self::ERROR_NOT_ENOUGH_WITNESSES]);
            }
        }
        
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
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_INVALID_LANGUAGE]);
        }
        
        $docs = [];
        $witnessNumber = 0;
        $totalNumDocs = 0;
        foreach ($witnessList as $witness) {
            if ($partialCollation) {
                if (!in_array(intval($witness['id']), $witnessesToInclude)) {
                    if ($witness['lang'] === $language) {
                        $totalNumDocs++;
                    }
                    continue;
                }
            }
            $doc = $witness;
            $docInfo = $db->getDocById($witness['id']);
            if ($docInfo['lang'] !== $language) {
                // not the right language
                continue;
            }
            
            $doc['number'] = ++$witnessNumber;
            $doc['errors'] = [];
            $doc['warning'] = '';
            $locations = $db->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
            if (count($locations)===0) {
                // No data for this witness, normally this should not happen
                continue;  // @codeCoverageIgnore
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
            $doc['itemStream'] =[];
            $doc['items'] = [];
            $doc['tokens'] = [];
            foreach($locations as $segment) {
                /* at this point only witnesses with valid segments
                 * are processed, so the following check is not
                 *  necessary
                if (!$segment['valid']) {
                    continue;
                }
                 */
                $segmentItemStream = $db->getItemStreamBetweenLocations((int) $doc['id'], $segment['start'], $segment['end']);
                $segmentItems = ItemStream::createItemArrayFromItemStream($segmentItemStream);
                $segmentTokens = \AverroesProject\Collation\Tokenizer::tokenize($segmentItems);
                $doc['itemStream'] = array_merge($doc['itemStream'], $segmentItemStream);
                $doc['items'] = array_merge($doc['items'], $segmentItems);
                $doc['tokens'] = array_merge($doc['tokens'], $segmentTokens);
            }
            
            $docs[] = $doc;
            $totalNumDocs++;
        }
        
        if (count($docs) < 2) {
            $msg = count($docs) . ' witness(es) found for ' . $langInfo['name'] . ', need at least 2 to collate.'; 
            if ($partialCollation) {
                $msg .= '<br/> It could be that the partial collation table request has wrong document ids.';
            }
            $this->logger->error($msg, $witnessesToInclude);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_NOT_ENOUGH_WITNESSES]);
        }
        
        $collatexWitnessArray  = [];
        foreach($docs as $theDoc) {
            $collatexWitnessArray[] = [
                'id' => $theDoc['title'],
                'tokens' => $theDoc['tokens']
                ];
        }
        $cr = $this->ci->cr;
        $profiler->lap('Pre-Collatex');
        $output = $cr->collate($collatexWitnessArray);
        
        if ($output === []) {
            // @codeCoverageIgnoreStart
            // Collatex errors are tested somewhere else
            $this->ci->logger->error("Collation Error: error running Collatex",
                    [ 'data' => $collatexWitnessArray, 
                      'collationEngineDetails' => $cr->getRunDetails() ]);
            $msg = "Error running Collatex, please report it";
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR]);
            // @codeCoverageIgnoreEnd
        }
        $profiler->log($this->ci->logger);

        return $response->withJson([
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'langName' => $langInfo['name'],
                'isPartial' => $partialCollation,
                'rtl' => $langInfo['rtl'],
                'work_info' => $workInfo,
                'docs' => $docs,
                'num_docs' => count($docs),
                'total_num_docs' => $totalNumDocs,
                'collatexOutput' => $output,
            ]);
    }
}
