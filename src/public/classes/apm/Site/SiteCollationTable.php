<?php
/*
 * Copyright (C) 2016-18 Universität zu Köln
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
   
    
    public function quickCollationPage(Request $request, Response $response, $next)
    {
        return $this->renderPage($response, 'apm/collation.quick.twig', [
            'contactName' => $this->config['support_contact_name'],
            'contactEmail' => $this->config['support_contact_email']
        ]);

    }
    
    public function automaticCollationPage(Request $request, Response $response, $args) 
    {
        $dm = $this->dataManager;
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $language = $request->getAttribute('lang');
        $profiler = new ApmProfiler("AutomaticCollation-$workId-$chunkNumber-$language", $dm);
        
        $warnings = [];
        
        $apiCallOptions = [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'lang' => $language,
            'witnesses' => []
        ];
        
        // get witnesses to include
        $partialCollation = false;
        if (isset($args['docs'])) {
            $docsInArgs = explode('/', $args['docs']);
            foreach ($docsInArgs as $docId) {
                $docId = intval($docId);
                if ($docId !== 0) {
                    $apiCallOptions['witnesses'][] = ['type' => 'doc', 'id' => $docId];
                }
            }
            $partialCollation = true;
        }
        
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
            return $this->renderPage($response, 'chunk.collation.error.twig', [
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'isPartial' => $partialCollation,
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
        
        $canViewExperimentalData = 0;
        if ($dm->um->isUserAllowedTo($this->userInfo['id'], 'act-view-experimental-data')) {
            $canViewExperimentalData = 1;
        }
        
        
        $profiler->log($this->logger);
        
        return $this->renderPage($response, 'apm/collationtable.twig', [
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'apiCallOptions' => $apiCallOptions,
                'langName' => $langInfo['name'],
                'isPartial' => $partialCollation,
                'rtl' => $langInfo['rtl'],
                'work_info' => $workInfo,
                'num_docs' => $partialCollation ? count($apiCallOptions['witnesses']) : count($validWitnesses),
                'total_num_docs' => count($validWitnesses),
                'availableWitnesses' => $availableWitnesses,
                'canViewExperimentalData' => $canViewExperimentalData,
                'warnings' => $warnings
            ]);
        
        
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
