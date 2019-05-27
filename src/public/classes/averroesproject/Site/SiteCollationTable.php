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


namespace AverroesProject\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\ItemStream\ItemStream;
use AverroesProject\Profiler\ApmProfiler;

/**
 * Site Controller class
 *
 */
class SiteCollationTable extends SiteController
{
//    public function collationTablePage(Request $request, Response $response, $args) 
//    {
//        $db = $this->db;
//        $workId = $request->getAttribute('work');
//        $chunkNumber = $request->getAttribute('chunk');
//        $language = $request->getAttribute('lang');
//        $profiler = new ApmProfiler("CollationTable-$workId-$chunkNumber-$language", $db);
//        $workInfo = $db->getWorkInfo($workId);
//        $witnessList = $db->getDocsForChunk($workId, $chunkNumber);
//        
//        $docsToInclude = [];
//        $partialCollation = false;
//        if (isset($args['docs'])) {
//            $docsInArgs = explode('/', $args['docs']);
//            foreach ($docsInArgs as $docId) {
//                $docId = intval($docId);
//                if ($docId !== 0) {
//                    $docsToInclude[] = $docId;
//                }
//            }
//            $partialCollation = true;
//            $this->ci->logger->debug('Partial collation', $docsToInclude);
//            if (count($docsToInclude) < 2) {
//                $msg = 'Error in partial collation table request: need at least 2 witnesses to collate, got only ' . count($docsToInclude) . '.';
//                return $this->ci->view->render($response, 'chunk.collation.error.twig', [
//                    'userinfo' => $this->ci->userInfo, 
//                    'copyright' => $this->ci->copyrightNotice,
//                    'baseurl' => $this->ci->settings['baseurl'],
//                    'work' => $workId,
//                    'chunk' => $chunkNumber,
//                    'langName' => $language,
//                    'isPartial' => $partialCollation,
//                    'message' => $msg
//                ]);
//            }
//            
//        }
//        
//        $languages = $this->ci->settings['languages'];
//        $langInfo = null;
//        foreach($languages as $lang) {
//            if ($lang['code'] === $language) {
//                $langInfo = $lang;
//            }
//        }
//        
//        if (is_null($langInfo)) {
//            $msg = 'Invalid language <b>' . $language . '</b>';
//            return $this->ci->view->render($response, 'chunk.collation.error.twig', [
//                'userinfo' => $this->ci->userInfo, 
//                'copyright' => $this->ci->copyrightNotice,
//                'baseurl' => $this->ci->settings['baseurl'],
//                'work' => $workId,
//                'chunk' => $chunkNumber,
//                'lang' => $language,
//                'isPartial' => $partialCollation,
//                'message' => $msg
//            ]);
//        }
//        
//        $docs = [];
//        $witnessNumber = 0;
//        $totalNumDocs = 0;
//        foreach ($witnessList as $witness) {
//            if ($partialCollation) {
//                if (!in_array(intval($witness['id']), $docsToInclude)) {
//                    if ($witness['lang'] === $language) {
//                        $totalNumDocs++;
//                    }
//                    continue;
//                }
//            }
//            $doc = $witness;
//            $docInfo = $db->getDocById($witness['id']);
//            if ($docInfo['lang'] !== $language) {
//                // not the right language
//                continue;
//            }
//            
//            $doc['number'] = ++$witnessNumber;
//            $doc['errors'] = [];
//            $doc['warning'] = '';
//            $locations = $db->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
//            if (count($locations)===0) {
//                // No data for this witness, normally this should not happen
//                continue;
//            }
//            // Check if there's an invalid segment
//            $invalidSegment = false;
//            foreach($locations as $segment) {
//                if (!$segment['valid']) {
//                    $invalidSegment = true;
//                    break;
//                }
//            }
//            if ($invalidSegment) {
//                continue; // nothing to do with this witness
//            }
//            $doc['itemStream'] =[];
//            $doc['items'] = [];
//            $doc['tokens'] = [];
//            foreach($locations as $segment) {
//                if (!$segment['valid']) {
//                    continue;
//                }
//                $segmentItemStream = $db->getItemStreamBetweenLocations((int) $doc['id'], $segment['start'], $segment['end']);
//                $segmentItems = ItemStream::createItemArrayFromItemStream($segmentItemStream);
//                $segmentTokens = \AverroesProject\Collation\Tokenizer::tokenize($segmentItems);
//                $doc['itemStream'] = array_merge($doc['itemStream'], $segmentItemStream);
//                $doc['items'] = array_merge($doc['items'], $segmentItems);
//                $doc['tokens'] = array_merge($doc['tokens'], $segmentTokens);
//            }
//            
//            $docs[] = $doc;
//            $totalNumDocs++;
//        }
//        
//        if (count($docs) < 2) {
//            $msg = count($docs) . ' witness(es) found for ' . $langInfo['name'] . ', need at least 2 to collate.'; 
//            if ($partialCollation) {
//                $msg .= '<br/> It could be that the partial collation table request has wrong document ids.';
//            }
//            return $this->ci->view->render($response, 'chunk.collation.error.twig', [
//                'userinfo' => $this->ci->userInfo, 
//                'copyright' => $this->ci->copyrightNotice,
//                'baseurl' => $this->ci->settings['baseurl'],
//                'work' => $workId,
//                'chunk' => $chunkNumber,
//                'lang' => $language,
//                'langName' => $langInfo['name'],
//                'isPartial' => $partialCollation,
//                'message' => $msg
//            ]);
//        }
//        
//        $collatexWitnessArray  = [];
//        foreach($docs as $theDoc) {
//            $collatexWitnessArray[] = [
//                'id' => $theDoc['title'],
//                'tokens' => $theDoc['tokens']
//                ];
//        }
//        
//        $cr = $this->ci->cr;
//        $profiler->lap('Pre-Collatex');
//        $output = $cr->run($collatexWitnessArray);
//        
//        if ($output === false) {
//            $this->ci->logger->error("Collation Error: error running Collatex",
//                    [ 'data' => $collatexWitnessArray, 
//                      'collatexRunnerError' => $cr->error, 
//                      'rawOutput' => $cr->rawOutput ]);
//            $msg = "Error running Collatex, please report it";
//            return $this->ci->view->render($response, 'chunk.collation.error.twig', [
//                'userinfo' => $this->ci->userInfo, 
//                'copyright' => $this->ci->copyrightNotice,
//                'baseurl' => $this->ci->settings['baseurl'],
//                'work' => $workId,
//                'chunk' => $chunkNumber,
//                'lang' => $language,
//                'langName' => $langInfo['name'],
//                'isPartial' => $partialCollation,
//                'message' => $msg
//            ]);
//        }
//        
//        $showExpandCollapseButton = false;
//        if ($this->db->um->isUserAllowedTo($this->ci->userInfo['id'], 'expandCollapseCollationTable')) {
//            $showExpandCollapseButton = true;
//        }
//        
//        $profiler->log($this->ci->logger);
//        return $this->ci->view->render($response, 'chunk.collation.twig', [
//                'userinfo' => $this->ci->userInfo, 
//                'copyright' => $this->ci->copyrightNotice,
//                'baseurl' => $this->ci->settings['baseurl'],
//                'work' => $workId,
//                'chunk' => $chunkNumber,
//                'lang' => $language,
//                'langName' => $langInfo['name'],
//                'isPartial' => $partialCollation,
//                'rtl' => $langInfo['rtl'],
//                'work_info' => $workInfo,
//                'docs' => $docs,
//                'num_docs' => count($docs),
//                'total_num_docs' => $totalNumDocs,
//                'collatexOutput' => $output,
//                'showExpandCollapseButton' => $showExpandCollapseButton
//            ]);
//        
//        
//    }
    
//    public function quickCollationPage(Request $request, Response $response, $next)
//    {
//        return $this->ci->view->render($response, 'collation.quick.twig', [
//            'contactName' => $this->ci->settings['support-contact-name'],
//            'contactEmail' => $this->ci->settings['support-contact-email'],
//            'copyright' => $this->ci->copyrightNotice,
//            'baseurl' => $this->ci->settings['baseurl'],
//        ]);
//    }
}
