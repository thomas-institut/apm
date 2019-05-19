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
use APM\Presets\Preset;
use APM\Math\Set;
use APM\System\PresetFactory;

/**
 * Description of ApiPresets
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApiPresets extends ApiController
{
    
    const API_ERROR_UNRECOGNIZED_TOOL = 4001;
    const API_ERROR_NOT_ENOUGH_WITNESSES = 4002;
    const API_ERROR_UNKNOWN_COMMAND = 4003;
    const API_ERROR_INVALID_PRESET_DATA = 4004;
    const API_ERROR_PRESET_ALREADY_EXISTS = 4005;
    const API_ERROR_CANNOT_SAVE_PRESET = 4006;
    const API_ERROR_PRESET_DOES_NOT_EXIST = 4007;
    const API_ERROR_PRESET_MISMATCH = 4008;
    const API_ERROR_CANNOT_DELETE = 4009;
    
    
    const COMMAND_NEW = 'new';
    const COMMAND_UPDATE = 'update';
    
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
            $userInfo = $this->db->um->getUserInfoByUserId($preset->getUserId());
            $presetsInArrayForm[] = [
                'userId' => $preset->getUserId(),
                'userName' => $userInfo['fullname'],
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
    
    public function  savePreset(Request $request, 
            Response $response, $next) {
        
        $apiCall = 'savePreset';
        $profiler = new ApmProfiler($apiCall, $this->db);
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['command', 'tool',  'userId', 'title', 'presetId', 'presetData']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $command = $inputData['command'];
        
        // check that command is valid
        if ($command !== self::COMMAND_NEW && $command !== self::COMMAND_UPDATE) {
            $this->logger->error("Unknown command " . $command,
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_UNKNOWN_COMMAND,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_UNKNOWN_COMMAND]);
        }
        
        $userId = intval($inputData['userId']);
        $tool = $inputData['tool'];
        $title = $inputData['title'];
        
        // check that tool is valid
        if (!$this->sm->isToolValid($tool)){
            $this->logger->error("Unrecognized tool " . $tool,
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_UNRECOGNIZED_TOOL,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_UNRECOGNIZED_TOOL]);
        }
        
        
        $presetId = intval($inputData['presetId']);
        $data = $inputData['presetData'];
        
        // check that preset data is an array and that is not empty
        if (!is_array($data) || count($data)===0) {
            $this->logger->error("Invalid preset data",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_INVALID_PRESET_DATA,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_INVALID_PRESET_DATA]);
        }
        
        $pm = $this->sm->getPresetsManager();
        $pf = new PresetFactory();
        if ($command === self::COMMAND_NEW) {
            $preset = $pf->create($tool, $userId, $title, $data);
            if ($pm->correspondingPresetExists($preset)) {
                $this->logger->error("Preset already exists",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_PRESET_ALREADY_EXISTS,
                      'data' => $inputData ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_PRESET_ALREADY_EXISTS]);
            }
            if (!$pm->addPreset($preset)) {
                $this->logger->error("Could not save new preset",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_CANNOT_SAVE_PRESET,
                      'data' => $inputData ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_CANNOT_SAVE_PRESET]);
            }
            // success
            $newId = $pm->getPreset($tool, $userId, $title)->getId();
            $profiler->log($this->logger);
            return $response->withStatus(200)->withJson(['presetId' => $newId]);
        }
        
        // command = update preset
        
        // check that userId is the same as the current preset's userId
        if (intval($this->ci->userId) !== $userId) {
            $this->logger->error("API user not authorized to update preset",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_NOT_AUTHORIZED,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NOT_AUTHORIZED]);
        }
        
        $currentPreset = $pm->getPresetById($presetId);
        if ($currentPreset === false) {
            $this->logger->error("Preset with given Id does not exist",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_PRESET_DOES_NOT_EXIST,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_PRESET_DOES_NOT_EXIST]);
        }
        if ($currentPreset->getTool() !== $tool || $currentPreset->getUserId() !== $userId) {
            $this->logger->error("Preset to update does not match existing preset",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_PRESET_MISMATCH,
                      'data' => $inputData ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_PRESET_MISMATCH]);
        }
        
        
        $updatedPreset = $pf->create($tool, $userId, $title, $data);
        if (!$pm->updatePresetById($presetId, $updatedPreset)) {
            $this->logger->error("Could not update preset",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_CANNOT_SAVE_PRESET,
                      'data' => $inputData ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_CANNOT_SAVE_PRESET]);
        }
        
        // success
        $profiler->log($this->logger);
        return $response->withStatus(200)->withJson(['presetId' => $presetId]);
    }
    
     public function deletePreset(Request $request, 
            Response $response, $next) {
        $apiCall = 'deletePreset';
        $profiler = new ApmProfiler($apiCall, $this->db);
        $presetId = intval($request->getAttribute('id'));
        
        $pm = $this->sm->getPresetsManager();
        
        $currentPreset = $pm->getPresetById($presetId);
        if ($currentPreset === false) {
            $this->logger->error("Preset with given Id does not exist",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_PRESET_DOES_NOT_EXIST,
                      'presetId'  => $presetId ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_PRESET_DOES_NOT_EXIST]);
        }
        if ($currentPreset->getUserId() !== intval($this->ci->userId)) {
            $this->logger->error("API user not authorized to delete preset",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_NOT_AUTHORIZED,
                      'presetUserId' => $currentPreset->getUserId()
                    ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NOT_AUTHORIZED]);
        }
        
        if (!$pm->erasePresetById($presetId)) {
            $this->logger->error("Cannot delete preset",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_CANNOT_DELETE,
                      'presetId'  => $presetId ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_CANNOT_DELETE]);
        }
        // success
        $profiler->log($this->logger);
        return $response->withStatus(200)->withJson(['presetId' => $presetId]);
    }
    
}


