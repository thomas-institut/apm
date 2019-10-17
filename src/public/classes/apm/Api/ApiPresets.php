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

namespace APM\Api;

use APM\System\SystemManager;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

use AverroesProject\Profiler\ApmProfiler;
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
    const API_ERROR_CANNOT_DELETE = 4008;

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
     * @return Response
     */
    public function  getPresets(Request $request,  Response $response) {
        
        $apiCall = 'getPresets';
        $profiler = new ApmProfiler($apiCall, $this->dataManager);
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
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_WRONG_TYPE], 409);
        }
        
        if (!$this->systemManager->isToolValid($tool)) {
            $this->logger->error("Unrecognized tool",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_UNRECOGNIZED_TOOL,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_UNRECOGNIZED_TOOL], 409);
        }
        
        
        if (!is_array($keyArrayToMatch)) {
            $this->logger->error("Field 'keyArrayToMatch' must be an array",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_WRONG_TYPE], 409);
        }
        
        $this->logger->debug('Getting presets', [ 'tool' => $tool, 'userId' => $userId, 'keyArrayToMatch' => $keyArrayToMatch]);
        // let's get those presets!

        $presetManager = $this->systemManager->getPresetsManager();
        
        if ($userId === false) {
            $presets = $presetManager->getPresetsByToolAndKeys($tool, $keyArrayToMatch);
        } else {
            $presets = $presetManager->getPresetsByToolUserIdAndKeys($tool, $userId, $keyArrayToMatch);
        }
        
        $presetsInArrayForm = [];
        foreach($presets as $preset) {
            $presetsInArrayForm[] = [
                'id' => $preset->getId(),
                'title' => $preset->getTitle(),
                'userId' => $preset->getUserId(),
                'data' => $preset->getData()
            ];
        }
        
        $profiler->log($this->logger);
        
        return $this->responseWithJson($response,[
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
     * @return Response
     */
    public function  getAutomaticCollationPresets(Request $request, Response $response) {
        
        $apiCall = 'getAutomaticCollationPresets';
        $profiler = new ApmProfiler($apiCall, $this->dataManager);
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['userId', 'lang', 'witnesses']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $tool = SystemManager::TOOL_AUTOMATIC_COLLATION;
        
        $userId = (is_int($inputData['userId']) && $inputData['userId'] > 0) ? $inputData['userId'] : false;
        $lang = $inputData['lang'];
        $witnesses = $inputData['witnesses'];
        
        // Check that the input parameters make sense
        if (!is_array($witnesses)) {
            $this->logger->error("Field 'witnesses' must be an array",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_WRONG_TYPE], 409);
        }
        
        if (count($witnesses) < 2) {
            $this->logger->error("Field 'witnesses' must have 2 or more elements",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_NOT_ENOUGH_WITNESSES,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_NOT_ENOUGH_WITNESSES], 409);
        }

        $this->logger->debug('Getting automatic collation presets', [ 'lang' => $lang, 'userId' => $userId, 'witnesses' => $witnesses]);
        // let's get those presets!
       
        
        $presetManager = $this->systemManager->getPresetsManager();
        //$presets = [];
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
            $userInfo = $this->dataManager->userManager->getUserInfoByUserId($preset->getUserId());
            $presetsInArrayForm[] = [
                'userId' => $preset->getUserId(),
                'userName' => $userInfo['fullname'],
                'presetId' => $preset->getId(),
                'title' => $preset->getTitle(),
                'data' => $preset->getData()
            ];
        }
        
        $profiler->log($this->logger);
        
        return $this->responseWithJson($response,[
            'presets' => $presetsInArrayForm,
            'runTime' => $profiler->getTotalTime()
            ]);
    }
    
    public function  savePreset(Request $request, Response $response) {
        
        $apiCall = 'savePreset';
        $profiler = new ApmProfiler($apiCall, $this->dataManager);
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['command', 'tool',  'userId', 'title', 'presetId', 'presetData']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $command = $inputData['command'];
        
        // check that command is valid
        if ($command !== self::COMMAND_NEW && $command !== self::COMMAND_UPDATE) {
            $this->logger->error("Unknown command " . $command,
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_UNKNOWN_COMMAND,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_UNKNOWN_COMMAND], 409);
        }
        
        $tool = $inputData['tool'];
        $title = $inputData['title'];
        
        // check that tool is valid
        if (!$this->systemManager->isToolValid($tool)){
            $this->logger->error("Unrecognized tool " . $tool,
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_UNRECOGNIZED_TOOL,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_UNRECOGNIZED_TOOL], 409);
        }
        
        
        $presetId = intval($inputData['presetId']);
        $data = $inputData['presetData'];
        
        // check that preset data is an array and that is not empty
        if (!is_array($data) || count($data)===0) {
            $this->logger->error("Invalid preset data",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_INVALID_PRESET_DATA,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_INVALID_PRESET_DATA], 409);
        }
        
        $pm = $this->systemManager->getPresetsManager();
        $pf = new PresetFactory();
        $apiUserId = $this->userId;
        if ($command === self::COMMAND_NEW) {
            // Notice: when creating a new preset, the API ignores the given userId and presetId,
            // defaults to the user authenticated by the system and generates a new preset Id
            $preset = $pf->create($tool, $apiUserId, $title, $data);
            if ($pm->correspondingPresetExists($preset)) {
                $this->logger->error("Preset already exists",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_PRESET_ALREADY_EXISTS,
                      'data' => $inputData ]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_PRESET_ALREADY_EXISTS], 409);
            }
            if (!$pm->addPreset($preset)) {
                // @codeCoverageIgnoreStart
                $this->logger->error("Could not save new preset",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_CANNOT_SAVE_PRESET,
                      'data' => $inputData ]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_SAVE_PRESET], 409);
                // @codeCoverageIgnoreEnd
            }
            // success
            $newId = $pm->getPreset($tool, $apiUserId, $title)->getId();
            $profiler->log($this->logger);
            return $this->responseWithJson($response, ['presetId' => $newId], 200);
        }
        
        // command = update preset

        $currentPreset = $pm->getPresetById($presetId);
        if ($currentPreset === false) {
            $this->logger->error("Preset with given Id does not exist",
                [ 'apiUserId' => $this->userId,
                    'apiError' => self::API_ERROR_PRESET_DOES_NOT_EXIST,
                    'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_PRESET_DOES_NOT_EXIST], 409);
        }

        // check that userId is the same as the current preset's userId
        if (intval($this->userId) !== $currentPreset->getUserId()) {
            $this->logger->error("API user not authorized to update preset",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_NOT_AUTHORIZED,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_NOT_AUTHORIZED], 409);
        }

        $updatedPreset = $pf->create($tool, $this->userId, $title, $data);
        if (!$pm->updatePresetById($presetId, $updatedPreset)) {
            // @codeCoverageIgnoreStart
            $this->logger->error("Could not update preset",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_CANNOT_SAVE_PRESET,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_SAVE_PRESET], 409);
            // @codeCoverageIgnoreEnd
        }
        
        // success
        $profiler->log($this->logger);
        return $this->responseWithJson($response, ['presetId' => $presetId], 200);
    }
    
     public function deletePreset(Request $request, Response $response) {
        $apiCall = 'deletePreset';
        $profiler = new ApmProfiler($apiCall, $this->dataManager);
        $presetId = intval($request->getAttribute('id'));
        
        $presetsManager = $this->systemManager->getPresetsManager();

        $currentPreset = $presetsManager->getPresetById($presetId);
        if ($currentPreset === false) {
            $this->logger->error("Preset with given Id does not exist",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_PRESET_DOES_NOT_EXIST,
                      'presetId'  => $presetId ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_PRESET_DOES_NOT_EXIST], 409);
        }
        if ($currentPreset->getUserId() !== intval($this->userId)) {
            $this->logger->error("API user not authorized to delete preset",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_NOT_AUTHORIZED,
                      'presetUserId' => $currentPreset->getUserId()
                    ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_NOT_AUTHORIZED], 409);
        }
        
        if (!$presetsManager->erasePresetById($presetId)) {
            // @codeCoverageIgnoreStart
            $this->logger->error("Cannot delete preset",
                    [ 'apiUserId' => $this->userId,
                      'apiError' => self::API_ERROR_CANNOT_DELETE,
                      'presetId'  => $presetId ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_DELETE], 409);
            // @codeCoverageIgnoreEnd
        }
        // success
        $profiler->log($this->logger);
        return $this->responseWithJson($response, ['presetId' => $presetId], 200);
    }
    
}


