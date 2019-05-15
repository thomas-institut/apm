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

namespace APM\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

use AverroesProject\Profiler\ApmProfiler;

/**
 * Description of ApiPresets
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApiPresets extends ApiController
{
    
    /**
     * API call to get all the presets by tool 
     * 
     *   
     * @param Request $request
     * @param Response $response
     * @param type $next
     */
    public function  getPresets(Request $request, 
            Response $response, $next) {
        
        $apiCall = 'getPresets';
        $profiler = new ApmProfiler($apiCall, $this->db);
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['tool','userId', 'matchArray']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $tool = $inputData['tool'];
        $userId = (is_int($inputData['userId']) && $inputData['userId'] > 0) ? $inputData['userId'] : false;
        $matchArray = $inputData['matchArray'];
        
        // Check that the input parameters make sense
        if (!is_string($tool) || $tool==='') {
            $this->logger->error("Field 'tool' must be a non-empty string",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_TYPE]);
        }
        
        if (!is_array($matchArray)) {
            $this->logger->error("Field 'matchArray' must be an array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_TYPE]);
        }
        foreach($matchArray as $idToMatch) {
            if (!is_int($idToMatch) || $idToMatch <= 0) {
                $this->logger->error("All elements of 'matchArray' must be integers greater than zero",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_TYPE]);
            }
        }
        
        // let's get those presets!
       
        $presets = [];
        
        $profiler->log($this->logger);
        
        return $response->withJson([
            'presets' => $presets,
            'runTime' => $profiler->getTotalTime()
            ]);
    }
}
