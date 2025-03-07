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

use APM\System\Person\PersonNotFoundException;

use APM\System\Preset\Preset;
use APM\System\Preset\PresetManager;
use APM\System\SystemManager;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use APM\ToolBox\Set;
use APM\System\PresetFactory;

/**
 * Description of ApiPresets
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApiPresets extends ApiController
{

    const CLASS_NAME = 'Presets';
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
     *  keyArrayToMatch: array of keys and values that will be used
     *      to match the presets in the system. The given keys will be matched
     *      exactly. A key that is not present will be matched by any value
     *      of that key.
     *
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function  getPresets(Request $request,  Response $response) : Response{

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        
        $inputData = $this->checkAndGetInputData($request, $response, ['tool', 'userId', 'keyArrayToMatch']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $tool = $inputData['tool'];
        $userId = intval($inputData['userId']);
        $keyArrayToMatch = $inputData['keyArrayToMatch'];
        
        // Check that the input parameters make sense
        if (!is_string($tool) || $tool==='') {
            $this->logger->error("Field 'tool' must be a non-empty string",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_WRONG_TYPE], 409);
        }
        
        if (!$this->systemManager->isToolValid($tool)) {
            $this->logger->error("Unrecognized tool",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_UNRECOGNIZED_TOOL,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_UNRECOGNIZED_TOOL], 409);
        }
        
        
        if (!is_array($keyArrayToMatch)) {
            $this->logger->error("Field 'keyArrayToMatch' must be an array",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_WRONG_TYPE], 409);
        }

        $presetManager = $this->systemManager->getPresetsManager();
        
        if ($userId < 0) {
            $presets = $presetManager->getPresetsByToolAndKeys($tool, $keyArrayToMatch);
        } else {
            $presets = $presetManager->getPresetsByToolUserIdAndKeys($tool, $userId, $keyArrayToMatch);
        }
        
        $presetsInArrayForm = [];
        foreach($presets as $preset) {
            /** @var Preset $preset */
            $presetsInArrayForm[] = [
                'presetId' => $preset->getPresetId(),
                'title' => $preset->getTitle(),
                'userId' => $preset->getUserId(),
                'data' => $preset->getData()
            ];
        }

        return $this->responseWithJson($response,[
            'presets' => $presetsInArrayForm,
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
     * @throws PersonNotFoundException
     */
    public function  getAutomaticCollationPresets(Request $request, Response $response): Response
    {

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        
        $inputData = $this->checkAndGetInputData($request, $response, ['userId', 'lang', 'witnesses']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $tool = SystemManager::TOOL_AUTOMATIC_COLLATION;
        
        $userId = intval($inputData['userId']);
        $lang = $inputData['lang'];
        $requestedWitnesses = $inputData['witnesses'];
        //$this->codeDebug("Getting presets for $lang", [ 'witnesses' => $requestedWitnesses]);


        
        // Check that the input parameters make sense
        if (!is_array($requestedWitnesses)) {
            $this->logger->error("Field 'witnesses' must be an array",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_WRONG_TYPE,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_WRONG_TYPE], 409);
        }
        
        if (count($requestedWitnesses) < 2) {
            $this->logger->error("Field 'witnesses' must have 2 or more elements",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_NOT_ENOUGH_WITNESSES,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_NOT_ENOUGH_WITNESSES], 409);
        }
        // deal with old code calling using only docIds as witnesses
        $witnesses = [];
        foreach($requestedWitnesses as $requestedWitness) {
            if (is_int($requestedWitnesses)) {
                $witnesses[] = 'fullTx-' . $requestedWitness . '-A';
                $this->logger->warning('Old code requesting preset for doc ' . $requestedWitness);
            } else {
                $witnesses[] = $requestedWitness;
            }
        }

        // let's get those presets!

        $presetManager = $this->systemManager->getPresetsManager();
        //$presets = [];
        if ($userId < 0) {
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
            $userId = $preset->getUserId();
            $userInfo = $this->systemManager->getPersonManager()->getPersonEssentialData($userId);
            $presetsInArrayForm[] = [
                'userId' => $preset->getUserId(),
                'userName' => $userInfo->name,
                'presetId' => $preset->getPresetId(),
                'title' => $preset->getTitle(),
                'data' => $preset->getData()
            ];
        }

        return $this->responseWithJson($response,[
            'presets' => $presetsInArrayForm,
//            'runTime' => $this->getProfilerTotalTime()
            ]);
    }


    /**
     * API call to get all the presets for sigla
     *
     * the data field inside the POST request MUST contain the following:
     *  lang: string, a valid language code
     *  witnesses: 2 or more witnesses to match
     *
     * it MAY also contain
     *  userId:  int,  if different from 0, the call will return the presets
     *                 for that user only
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws PersonNotFoundException
     */
    public function  getSiglaPresets(Request $request, Response $response): Response
    {

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        
        $inputData = $this->checkAndGetInputData($request, $response, ['lang', 'witnesses']);
        if (!is_array($inputData)) {
            return $inputData;
        }

        $tool = SystemManager::TOOL_SIGLA;
        $userId = isset($inputData['userId']) ? intval($inputData['userId']) : 0;
        $lang = $inputData['lang'];
        $requestedWitnesses = $inputData['witnesses'];

        // Check that the input parameters make sense
        if (!is_array($requestedWitnesses)) {
            $this->logger->error("Field 'witnesses' must be an array",
                [ 'apiUserId' => $this->apiUserId,
                    'apiError' => self::API_ERROR_WRONG_TYPE,
                    'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_WRONG_TYPE], 409);
        }

        $this->codeDebug('Getting sigla presets', [ 'lang' => $lang, 'userId' => $userId, 'witnesses' => $requestedWitnesses]);

        // convert requestedWitnesses Ids to short form
        $witnessesToLookUp  = [];
        foreach($requestedWitnesses as $witnessId) {
            $witnessType = WitnessSystemId::getType($witnessId);
            // only fullTx for now
            if ($witnessType === WitnessType::FULL_TRANSCRIPTION) {
                $witnessesToLookUp[] = $this->convertFullTxIdToSiglaPresetId($witnessId);
            }
        }
        $this->codeDebug('Witnesses to look up', ['witnesses' => $witnessesToLookUp]);

        // let's get those presets!

        $presetManager = $this->systemManager->getPresetsManager();

        if ($userId === 0) {
            $presets = $presetManager->getPresetsByToolAndKeys($tool, ['lang' => $lang]);
        } else {
            $presets = $presetManager->getPresetsByToolUserIdAndKeys($tool, $userId, ['lang' => $lang]);
        }

        // filter using the witness list
        $filteredPresets = [];
        $witnessSet = new Set($witnessesToLookUp);
        foreach($presets as $preset) {
            $presetWitnessesSet = new Set(array_keys($preset->getData()['witnesses']));
            if ($presetWitnessesSet->isSubsetOf($witnessSet)) {
                $filteredPresets[] = $preset;
            }
        }
        $presetsInArrayForm = [];
        foreach($filteredPresets as $preset) {
            $userId = $preset->getUserId();
            $userInfo = $this->systemManager->getPersonManager()->getPersonEssentialData($preset->getUserId());
            $presetsInArrayForm[] = [
                'userId' => $userId,
                'userName' => $userInfo->name,
                'presetId' => $preset->getPresetId(),
                'title' => $preset->getTitle(),
                'data' => $preset->getData()
            ];
        }
        return $this->responseWithJson($response,[
            'presets' => $presetsInArrayForm,
//            'runTime' => $this->getProfilerTotalTime()
        ]);
    }

    private function convertFullTxIdToSiglaPresetId(string $longFormId) : string {
        $info = WitnessSystemId::getFullTxInfo($longFormId);
        return implode('-', [ 'fullTx', $info->typeSpecificInfo['docId'], $info->typeSpecificInfo['localWitnessId']]);
    }

    /**
     * Saves/Updates a sigla preset
     *
     * the data field inside the POST request MUST contain the following:
     *  command:  'new' | 'update'
     *  lang: string, a valid language code, e.g. 'ar', 'la', etc.
     *  witnesses: an array of strings of the form
     *      witnesses['someWitnessId'] = 'someSiglum'
     *
     * if command === 'new', the following field is required
     *    title:  string
     *
     * if command === 'update', the following fields is required
     *   presetId: int
     *
     *  if there is a title field, it will be used to overwrite the current preset's title.
     * A preset update will fail if the api user is not the original creator of the preset.
     *
     *
     * @param Request $request
     * @param Response $response
     * @return array|Response
     */
    public function saveSiglaPreset(Request $request, Response $response): array|Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        
        $inputData = $this->checkAndGetInputData($request, $response, ['command', 'lang', 'witnesses']);
        if (!is_array($inputData)) {
            return $inputData;
        }

        $pm = $this->systemManager->getPresetsManager();
        $pf = new PresetFactory();
        $apiUserId = $this->apiUserId;
        $lang = $inputData['lang'];
        // get short form witnesses
        $witnesses = [];
        foreach($inputData['witnesses'] as $witnessId => $siglum) {
            if (WitnessSystemId::getType($witnessId) === WitnessType::FULL_TRANSCRIPTION) {
                $witnesses[$this->convertFullTxIdToSiglaPresetId($witnessId)] = $siglum;
            }
        }
        $presetData = [ 'lang' => $lang, 'witnesses' => $witnesses];

        switch($inputData['command']) {
            case self::COMMAND_NEW:
                if (!isset($inputData['title'])) {
                    $this->logger->error("Required field 'title' not present",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_INVALID_PRESET_DATA,
                            'data' => $inputData ]);
                    return $this->responseWithJson($response, ['error' => self::API_ERROR_INVALID_PRESET_DATA], 409);
                }
                if (!is_string($inputData['title']) || $inputData['title'] === '' ){
                    $this->logger->error("Required field 'title' is not a string or is empty",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_INVALID_PRESET_DATA,
                            'data' => $inputData ]);
                    return $this->responseWithJson($response, ['error' => self::API_ERROR_INVALID_PRESET_DATA], 409);
                }
                $title = $inputData['title'];

                $this->codeDebug('New Sigla Preset', [ 'apiUserId' => $apiUserId, 'title' => $title, 'presetData' => $presetData]);


                $preset = $pf->create(SystemManager::TOOL_SIGLA, $apiUserId, $title, $presetData);
                if ($pm->correspondingPresetExists($preset)) {
                    $this->logger->error("Preset already exists",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_PRESET_ALREADY_EXISTS,
                            'data' => $inputData ]);
                    return $this->responseWithJson($response, ['error' => self::API_ERROR_PRESET_ALREADY_EXISTS], 409);
                }
                if (!$pm->addPreset($preset)) {
                    // @codeCoverageIgnoreStart
                    $this->logger->error("Could not save new preset",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_CANNOT_SAVE_PRESET,
                            'data' => $inputData ]);
                    return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_SAVE_PRESET], 409);
                    // @codeCoverageIgnoreEnd
                }
                // success
                $newId = $pm->getPreset(SystemManager::TOOL_SIGLA, $apiUserId, $title)->getPresetId();
                return $this->responseWithJson($response, ['presetId' => $newId], 200);

            case self::COMMAND_UPDATE:
                if (!isset($inputData['presetId'])) {
                    $this->logger->error("Required field 'presetId' not present",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_INVALID_PRESET_DATA,
                            'data' => $inputData ]);
                    return $this->responseWithJson($response, ['error' => self::API_ERROR_INVALID_PRESET_DATA], 409);
                }
                $presetId = intval($inputData['presetId']);
                if ($presetId === 0) {
                    $this->logger->error("Required field 'presetId' not a valid Id",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_INVALID_PRESET_DATA,
                            'data' => $inputData ]);
                    return $this->responseWithJson($response, ['error' => self::API_ERROR_INVALID_PRESET_DATA], 409);
                }
                $currentPreset = $pm->getPresetById($presetId);
                // check that userId is the same as the current preset's userId
                if ($this->apiUserId !== $currentPreset->getUserId()) {
                    $this->logger->error("API user not authorized to update preset",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_NOT_AUTHORIZED,
                            'data' => $inputData ]);
                    return $this->responseWithJson($response, ['error' => self::API_ERROR_NOT_AUTHORIZED], 409);
                }
                $title = $currentPreset->getTitle();
                if (isset($inputData['title']) && is_string($inputData['title']) && $inputData['title'] !== 0) {
                    $title = $inputData['title'];
                }

                $updatedPreset = $pf->create(SystemManager::TOOL_SIGLA, $this->apiUserId, $title, $presetData);
                if (!$pm->updatePresetById($presetId, $updatedPreset)) {
                    // @codeCoverageIgnoreStart
                    $this->logger->error("Could not update preset",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_CANNOT_SAVE_PRESET,
                            'data' => $inputData ]);
                    return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_SAVE_PRESET], 409);
                    // @codeCoverageIgnoreEnd
                }

                // success
                return $this->responseWithJson($response, ['presetId' => $presetId]);

            default:
                $this->logger->error("Unknown command " . $inputData['command'],
                    [ 'apiUserId' => $this->apiUserId,
                        'apiError' => self::API_ERROR_UNKNOWN_COMMAND,
                        'data' => $inputData ]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_UNKNOWN_COMMAND], 409);
        }
    }

    
    public function  savePreset(Request $request, Response $response) : Response {

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        
        $inputData = $this->checkAndGetInputData($request, $response, ['command', 'tool', 'title', 'presetId', 'presetData']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        $command = $inputData['command'];
        // check that command is valid
        if ($command !== self::COMMAND_NEW && $command !== self::COMMAND_UPDATE) {
            $this->logger->error("Unknown command " . $command,
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_UNKNOWN_COMMAND,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_UNKNOWN_COMMAND], 409);
        }
        
        $tool = $inputData['tool'];
        $title = $inputData['title'];
        
        // check that tool is valid
        if (!$this->systemManager->isToolValid($tool)){
            $this->logger->error("Unrecognized tool " . $tool,
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_UNRECOGNIZED_TOOL,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_UNRECOGNIZED_TOOL], 409);
        }
        
        
        $presetId = intval($inputData['presetId']);
        $data = $inputData['presetData'];
        
        // check that preset data is an array and that is not empty
        if (!is_array($data) || count($data)===0) {
            $this->logger->error("Invalid preset data",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_INVALID_PRESET_DATA,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_INVALID_PRESET_DATA], 409);
        }
        
        $pm = $this->systemManager->getPresetsManager();
        $pf = new PresetFactory();
        $apiUserId = $this->apiUserId;
        if ($command === self::COMMAND_NEW) {
            // Notice: when creating a new preset, the API ignores the given userId and presetId,
            // defaults to the user authenticated by the system and generates a new preset Id
            $preset = $pf->create($tool, $apiUserId, $title, $data);
            //print_r($preset);
            if ($pm->correspondingPresetExists($preset)) {
                $this->logger->error("Preset already exists",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_PRESET_ALREADY_EXISTS,
                      'data' => $inputData ]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_PRESET_ALREADY_EXISTS], 409);
            }
            if (!$pm->addPreset($preset)) {
                // @codeCoverageIgnoreStart
                $this->logger->error("Could not save new preset",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_CANNOT_SAVE_PRESET,
                      'data' => $inputData ]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_SAVE_PRESET], 409);
                // @codeCoverageIgnoreEnd
            }
            // success
            $newId = $pm->getPreset($tool, $apiUserId, $title)->getPresetId();
            return $this->responseWithJson($response, ['presetId' => $newId], 200);
        }
        
        // command = update preset

        if (!$pm->presetExistsById($presetId)) {
            $this->logger->error("Preset with given Id does not exist",
                [ 'apiUserId' => $this->apiUserId,
                    'apiError' => self::API_ERROR_PRESET_DOES_NOT_EXIST,
                    'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_PRESET_DOES_NOT_EXIST], 409);
        }

        $currentPreset = $pm->getPresetById($presetId);
        // check that userId is the same as the current preset's userId
        if (intval($this->apiUserId) !== $currentPreset->getUserId()) {
            $this->logger->error("API user not authorized to update preset",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_NOT_AUTHORIZED,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_NOT_AUTHORIZED], 409);
        }

        $updatedPreset = $pf->create($tool, $this->apiUserId, $title, $data);
        $this->codeDebug('Updated preset', [ 'id' => $currentPreset->getPresetId(), 'data' => $updatedPreset->getData()]);
        if (!$pm->updatePresetById($presetId, $updatedPreset)) {
            // @codeCoverageIgnoreStart
            $this->logger->error("Could not update preset",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_CANNOT_SAVE_PRESET,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_SAVE_PRESET], 409);
            // @codeCoverageIgnoreEnd
        }
        
        // success
        return $this->responseWithJson($response, ['presetId' => $presetId], 200);
    }
    
     public function deletePreset(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $presetId = intval($request->getAttribute('id'));
        
        $presetsManager = $this->systemManager->getPresetsManager();

        try {
            $currentPreset = $presetsManager->getPresetById($presetId);
        } catch( InvalidArgumentException $e) {
            if ($e->getCode() === PresetManager::ERROR_PRESET_NOT_FOUND) {
                $this->logger->error("Preset with given Id does not exist",
                    [ 'apiUserId' => $this->apiUserId,
                        'apiError' => self::API_ERROR_PRESET_DOES_NOT_EXIST,
                        'presetId'  => $presetId ]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_PRESET_DOES_NOT_EXIST], 409);
            }
            // some other error, rethrow exception
            throw $e;
        }

        if ($currentPreset->getUserId() !== intval($this->apiUserId)) {
            $this->logger->error("API user not authorized to delete preset",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_NOT_AUTHORIZED,
                      'presetUserId' => $currentPreset->getUserId()
                    ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_NOT_AUTHORIZED], 409);
        }
        
        if (!$presetsManager->erasePresetById($presetId)) {
            // @codeCoverageIgnoreStart
            $this->logger->error("Cannot delete preset",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::API_ERROR_CANNOT_DELETE,
                      'presetId'  => $presetId ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_DELETE], 409);
            // @codeCoverageIgnoreEnd
        }
        // success
        return $this->responseWithJson($response, ['presetId' => $presetId], 200);
    }
    
}


