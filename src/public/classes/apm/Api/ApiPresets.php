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
use APM\System\ApmSystemManager;
use APM\Presets\DataTablePresetManager;
use APM\Math\Set;

/**
 * Description of ApiPresets
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApiPresets extends ApiController
{
    
    const API_ERROR_UNRECOGNIZED_TOOL = 4001;
    const API_ERROR_NOT_ENOUGH_WITNESSES = 4002;
    
    /**
     * API call to get all the presets by tool 
     * 
     * the data field inside the POST request must contain the following:
     * 
     *  tool: string, the name of the tool 
     *  userId: int or false, if an int is given the API will return the
     *      presets associated with the given userId. If false is given
     *      the API returns presets for all users
     *  keyArrayToMatch: array of keys and values that will be used to
     *      to match the presets in the system. The given keys will be matched
     *      exactly. A key that is not present will be matched by any value
     *      of that key.
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
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['tool','userId', 'keyArrayToMatch']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $tool = $inputData['tool'];
        $userId = (is_int($inputData['userId']) && $inputData['userId'] > 0) ? $inputData['userId'] : false;
        $keyArrayToMatch = $inputData['keyArrayToMatch'];
        
        // Check that the input parameters make sense
        if (!is_string($tool) || $tool==='') {
            $this->logger->error("Field 'tool' must be a non-empty string",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_TYPE]);
        }
        
        if (!$this->sm->isToolValid($tool)) {
            $this->logger->error("Unrecognized tool",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_UNRECOGNIZED_TOOL,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_UNRECOGNIZED_TOOL]);
        }
        
        
        if (!is_array($keyArrayToMatch)) {
            $this->logger->error("Field 'keyArrayToMatch' must be an array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_TYPE]);
        }
        
        $this->logger->debug('Getting presets', [ 'tool' => $tool, 'userId' => $userId, 'keyArrayToMatch' => $keyArrayToMatch]);
        // let's get those presets!
       
        
        $presets = [];
        
        $presetManager = $this->sm->getPresetsManager();
        
        if ($userId === false) {
            $presets = $presetManager->getPresetsByToolAndKeys($tool, $keyArrayToMatch);
        } else {
            $presets = $presetManager->getPresetsByToolUserIdAndKeys($tool, $userId, $keyArrayToMatch);
        }
        
        $presetsInArrayForm = [];
        foreach($presets as $preset) {
            $presetsInArrayForm[] = [
                'userId' => $preset->getUserId(),
                'data' => $preset->getData()
            ];
        }
        
        $profiler->log($this->logger);
        
        return $response->withJson([
            'presets' => $presetsInArrayForm,
            'runTime' => $profiler->getTotalTime()
            ]);
    }
    
    /**
     * API call to get all the presets for the automatic collation tool 
     * 
     * the data field inside the POST request must contain the following:
     * 
     *  userId: int or false, if an int is given the API will return the
     *      presets associated with the given userId. If false is given
     *      the API returns presets for all users
     *  lang: string, a valid language code
     *  witnesses: 2 or more witnesses to match
     * 
     *   
     * @param Request $request
     * @param Response $response
     * @param type $next
     */
    public function  getAutomaticCollationPresets(Request $request, 
            Response $response, $next) {
        
        $apiCall = 'getAutomaticCollationPresets';
        $profiler = new ApmProfiler($apiCall, $this->db);
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['userId', 'lang', 'witnesses']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $tool = ApmSystemManager::TOOL_AUTOMATIC_COLLATION;
        
        $userId = (is_int($inputData['userId']) && $inputData['userId'] > 0) ? $inputData['userId'] : false;
        $lang = $inputData['lang'];
        $witnesses = $inputData['witnesses'];
        
        // Check that the input parameters make sense
        if (!is_array($witnesses)) {
            $this->logger->error("Field 'witnesses' must be an array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_TYPE]);
        }
        
        if (count($witnesses) < 2) {
            $this->logger->error("Field 'witnesses' must have 2 or more elements",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_NOT_ENOUGH_WITNESSES,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NOT_ENOUGH_WITNESSES]);
        }

        $this->logger->debug('Getting automatic collation presets', [ 'lang' => $lang, 'userId' => $userId, 'witnesses' => $witnesses]);
        // let's get those presets!
       
        
        $presetManager = $this->sm->getPresetsManager();
        $presets = [];
        if ($userId === false) {
            $presets = $presetManager->getPresetsByToolAndKeys($tool, ['lang' => $lang]);
        } else {
            $presets = $presetManager->getPresetsByToolUserIdAndKeys($tool, $userId, ['lang' => $lang]);
        }
        
        // filter using the witness list
        $filteredPresets = [];
        $witnessSet = new Set($witnesses);
        foreach($presets as $preset) {
            $presetWitnessesSet = new Set($preset->getData()['witnesses']);
            if ($presetWitnessesSet->isSubsetOf($witnessSet)) {
                $filteredPresets[] = $preset;
            }
        }
        $presetsInArrayForm = [];
        foreach($filteredPresets as $preset) {
            $presetsInArrayForm[] = [
                'userId' => $preset->getUserId(),
                'presetId' => $preset->getId(),
                'title' => $preset->getTitle(),
                'data' => $preset->getData()
            ];
        }
        
        $profiler->log($this->logger);
        
        return $response->withJson([
            'presets' => $presetsInArrayForm,
            'runTime' => $profiler->getTotalTime()
            ]);
    }
    
}
