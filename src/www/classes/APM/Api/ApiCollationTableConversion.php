<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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


use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\TimeString\TimeString;

class ApiCollationTableConversion extends  ApiController
{
    const string CLASS_NAME = 'CollationTableConversion';
    const int ERROR_CANNOT_CONVERT = 6001;

    public function convertCollationTableToChunkEdition(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $inputData = $this->checkAndGetInputData($request, $response, ['tableId', 'initStrategy']);
        $this->debug('Input data', [ $inputData ]);
        if (!is_array($inputData)) {
            return $inputData;
        }
        $tableId = intval($inputData['tableId']);
        $initStrategy = $inputData['initStrategy'];
        $ctManager = $this->systemManager->getCollationTableManager();

        $this->systemManager->onCollationTableSaved($this->apiUserId, $tableId);

        try {
            $ctManager->convertToEdition($tableId, $initStrategy, $this->apiUserId, TimeString::now());
        } catch (Exception $e) {
            // table ID does not exist!
            $msg = "Error converting table to edition: '" . $e->getMessage() . "', error " . $e->getCode();
            $this->logger->error($msg,
                [ 'apiUserTid' => $this->apiUserId,
                    'apiError' => self::ERROR_CANNOT_CONVERT,
                    'data' => $inputData,
                ]);
            return $this->responseWithJson($response, ['error' => self::ERROR_CANNOT_CONVERT], 409);
        }

        return $this->responseWithJson($response, [
            'status' => 'OK',
            'url' => $this->router->urlFor('chunk-edition.edit', ['tableId' => $tableId])]);

    }

}