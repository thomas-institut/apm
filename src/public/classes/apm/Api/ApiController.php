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

use APM\System\SystemManager;

/**
 * API Controller class
 *
 */
abstract class ApiController
{
    protected $ci;
    protected $logger;
    /**
     *
     * @var SystemManager 
     */
    protected $sm;
    
    // Error codes
    const API_NO_ERROR = 0;
    const API_ERROR_NO_DATA = 1000;
    const API_ERROR_NO_ELEMENT_ARRAY = 1001;
    const API_ERROR_NO_EDNOTES = 1002;
    const API_ERROR_ZERO_ELEMENTS = 1003;
    const API_ERROR_MISSING_ELEMENT_KEY = 1004;
    const API_ERROR_WRONG_PAGE_ID = 1005;
    const API_ERROR_WRONG_COLUMN_NUMBER = 1006;
    const API_ERROR_WRONG_EDITOR_ID = 1007;
    const API_ERROR_EMPTY_ELEMENT = 1008;
    const API_ERROR_MISSING_ITEM_KEY = 1009;
    const API_ERROR_DUPLICATE_ITEM_ID = 1010;
    const API_ERROR_MISSING_EDNOTE_KEY = 1011;
    const API_ERROR_WRONG_TARGET_FOR_EDNOTE = 1012;
    const API_ERROR_WRONG_AUTHOR_ID = 1013;
    const API_ERROR_WRONG_DOCUMENT = 1014;
    const API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED = 1015;
    const API_ERROR_COLLATION_ENGINE_ERROR = 1016;
    const API_ERROR_MISSING_REQUIRED_FIELD = 1017;
    
    const API_ERROR_NOT_AUTHORIZED  = 1100;
    
    const API_ERROR_DB_UPDATE_ERROR = 1200;
    
    const API_ERROR_WRONG_TYPE = 1300;
            
    
    
    //Constructor
    public function __construct( $ci)
    {
       $this->ci = $ci;
       $this->db = $ci->db;
       $this->logger = $ci->logger->withName('API-new');
       $this->sm = $ci->sm;
    }
    
    /**
     * Checks that the given request contains a 'data' field, which in 
     * turn contains the given $requiredFields. 
     * 
     * If there's any error, returns a Response with the proper error status
     * If everything is OK, returns the input data array
     * 
     * @param Request $request
     * @param Response $response
     * @param string $apiCall
     * @param array $requiredFields
     * @return type
     */
    protected function checkAndGetInputData(Request $request, 
            Response $response, string $apiCall, array $requiredFields) {
        $rawData = $request->getBody()->getContents();
        parse_str($rawData, $postData);
        $inputData = null;
        
        if (isset($postData['data'])) {
            $inputData = json_decode($postData['data'], true);
        }
        
        // Some checks
        if (is_null($inputData) ) {
            $this->logger->error("$apiCall: no data in input",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_NO_DATA,
                      'rawdata' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NO_DATA]);
        }
        
        foreach ($requiredFields as $requiredField) {
            if (!isset($inputData[$requiredField])) {
                $this->logger->error("$apiCall: missing required field $requiredField in input data",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_MISSING_REQUIRED_FIELD,
                      'rawdata' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_MISSING_REQUIRED_FIELD]);
            }
        }
        
        return $inputData;
    }
}
