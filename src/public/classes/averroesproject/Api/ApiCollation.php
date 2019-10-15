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

namespace AverroesProject\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\Profiler\ApmProfiler;

/**
 * API Controller class
 *
 */
class ApiCollation extends ApiController
{
    
    public function quickCollation(Request $request, 
            Response $response, $next)
    {
        $profiler = new ApmProfiler('quickCollation', $this->dataManager);
        
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
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $inputDataObject ]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_DATA]);
        }
        
        $cr = $this->ci->cr;
        
        $output = $cr->run($inputDataObject['witnesses']);
        if ($output === false) {
            $this->logger->error("Quick Collation: error running Collatex",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_ERROR_RUNNING_COLLATEX,
                      'data' => $inputDataObject, 
                      'collatexRunnerError' => $cr->getErrorCode(), 
                      'rawOutput' => $cr->getRawOutput() ]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_ERROR_RUNNING_COLLATEX]);
        }
        
        $profiler->log($this->logger);
        return $response->withJson($output);
    }
    
}
