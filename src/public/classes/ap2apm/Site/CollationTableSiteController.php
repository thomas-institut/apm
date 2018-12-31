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

namespace AverroesProjectToApm\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\ItemStream\ItemStream;
use AverroesProject\Profiler\ApmProfiler;

/**
 * Description of CollationTable
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CollationTableSiteController extends SiteController
{
    public function automaticCollationPage(Request $request, Response $response, $args) 
    {
        $db = $this->db;
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $language = $request->getAttribute('lang');
        $profiler = new ApmProfiler("AutomaticCollation-$workId-$chunkNumber-$language", $db);
        
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
        $languages = $this->ci->settings['languages'];
        $langInfo = null;
        foreach($languages as $lang) {
            if ($lang['code'] === $language) {
                $langInfo = $lang;
            }
        }
        
        if (is_null($langInfo)) {
            $msg = 'Invalid language <b>' . $language . '</b>';
            return $this->ci->view->render($response, 'chunk.collation.error.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'isPartial' => $partialCollation,
                'message' => $msg
            ]);
        }
        
        // get work info
        $workInfo = $db->getWorkInfo($workId);
        
        // get total witness counts
        $validWitnesses = $this->getValidWitnessDocIdsForWorkChunkLang($db, $workId, $chunkNumber, $language);
        $availableWitnesses = [];
        foreach($validWitnesses as $witnessId) {
            $docInfo = $db->getDocById($witnessId);
            $availableWitnesses[] = [ 'type' => 'doc', 'id' => intVal($witnessId), 'title' => $docInfo['title']];
        }
        
        $profiler->log($this->ci->logger);
        
        return $this->ci->view->render($response, 'ap2apm/collationtable.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
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
                'warnings' => $warnings
            ]);
        
        
    }
    
    protected function getValidWitnessDocIdsForWorkChunkLang($db, $workId, $chunkNumber, $language) : array {
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
                // No data for this witness, normally this should not happen
                continue;
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
