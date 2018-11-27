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

use AverroesProject\ItemStream\ItemStream as ApItemStream;
use AverroesProjectToApm\ItemStream;

/**
 * Description of WitnessPage
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class WitnessPage extends SiteController {
    
    public function witnessPage(Request $request, Response $response, $next){
        
        $db = $this->db;
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $type = $request->getAttribute('type');
        //$profiler = new ApmProfiler("WitnessPage-$workId-$chunkNumber", $db);
        $workInfo = $db->getWorkInfo($workId);

        // Assume, for the time being, that type==='doc'
        
        $witnessId = $request->getAttribute('id');
        $doc = $db->getDocById($witnessId);
        
        $locations = $db->getChunkLocationsForDoc($witnessId, $workId, $chunkNumber);
        if (count($locations)===0) {
            $doc['errors'][] =  'Error in chunk info, did somebody just erased the chunks in this document? Please refresh';
            $doc['plain_text'] = '';
            $doc['goodWitness'] = false;
        }
        $doc['segments'] = $locations;
        $doc['plain_text'] = '';
        $doc['segmentApItemStreams'] = [];
        foreach($locations as $segLocation ) {
            if (!$segLocation['valid']) {
                foreach($segLocation['warnings'] as $w) {
                    $doc['warnings'][] = $w;
                }
                $doc['goodWitness'] = false;
                continue;
            }
            $apItemStream = $db->getItemStreamBetweenLocations((int) $doc['id'], $segLocation['start'], $segLocation['end']);
            $doc['segmentApItemStreams'][] = $apItemStream;
            $doc['plain_text'] .= ApItemStream::getPlainText($apItemStream) . ' '; // CHECK: Space in between? 
            
        }
        
        $itemStream = new ItemStream($witnessId, $doc['segmentApItemStreams'], $doc['lang']);
        
        $this->ci->logger->debug('Itemstream with ' . count($itemStream->getItems()) . ' items');
        $html = '';
        $formatter = new \AverroesProjectToApm\Formatter\WitnessPageFormatter();
        foreach($itemStream->getItems() as $item) {
            $html .= $formatter->formatTextualItem($item->getItem());
            
        }
        
        $doc['itemStreamDump'] =  print_r($itemStream, true);
        $doc['formatted'] = $html;
        
        return $this->ci->view->render($response, 'ap2apm/witness.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'work' => $workId,
            'chunk' => $chunkNumber,
            'type' => $type,
            'witnessid' => $witnessId,
            'work_info' => $workInfo,
            'doc' => $doc
        ]);
    }
}
