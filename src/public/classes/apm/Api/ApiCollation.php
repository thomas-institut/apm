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

/**
 * API Controller class
 *
 */
class ApiCollation extends ApiController
{
    const ERROR_NO_WITNESSES = 2000;
    const ERROR_NOT_ENOUGH_WITNESSES = 2001;
    const ERROR_BAD_WITNESS = 2002;
    
    public function quickCollation(Request $request, 
            Response $response, $next)
    {
        $profiler = new ApmProfiler('quickCollation-new', $this->db);
        
        
        $rawData = $request->getBody()->getContents();
        parse_str($rawData, $postData);
        $inputDataObject = null;
        
        if (isset($postData['data'])) {
            $inputDataObject = json_decode($postData['data'], true);
        }
        
        
        // Some checks
        if (is_null($inputDataObject) ) {
            $this->logger->error("Quick Collation: no data in input",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'rawdata' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_DATA]);
        }
        
        if (!isset($inputDataObject['witnesses'])) {
            $this->logger->error("Quick Collation: no witnesses in input data",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::ERROR_NO_WITNESSES,
                      'data' => $inputDataObject ]);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_NO_WITNESSES]);
        }
        
        $witnesses = $inputDataObject['witnesses'];
        if (count($witnesses) < 2) {
            $this->logger->error("Quick Collation: not enough witnessess in data, got " . count($witnesses),
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::ERROR_NOT_ENOUGH_WITNESSES,
                      'data' => $inputDataObject ]);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_NOT_ENOUGH_WITNESSES]);
        }
        
        // Check witness data
        foreach ($witnesses as $witness) {
            if (!isset($witness['title']) || !isset($witness['text'])) {
                $this->logger->error("Quick Collation: bad witness in data",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::ERROR_BAD_WITNESS,
                      'data' => $inputDataObject ]);
            return $response->withStatus(409)->withJson( ['error' => self::ERROR_BAD_WITNESS]);
            }
        }
        $cr = $this->ci->cr;
        
        // Construct the temporary witnesses
        
        // Run Collatex
        $output = 'This would be the result of running Collatex';
        //$output = $cr->run($inputDataObject['witnesses']);
//        if ($output === false) {
//            $this->logger->error("Quick Collation: error running Collatex",
//                    [ 'apiUserId' => $this->ci->userId, 
//                      'apiError' => ApiController::API_ERROR_ERROR_RUNNING_COLLATEX,
//                      'data' => $inputDataObject, 
//                      'collatexRunnerError' => $cr->error, 
//                      'rawOutput' => $cr->rawOutput ]);
//            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_ERROR_RUNNING_COLLATEX]);
//        }
        
        $profiler->log($this->logger);
        
        return $response->withJson([$output]);
    }
    
}
