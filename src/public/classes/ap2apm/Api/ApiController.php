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

namespace AverroesProjectToApm\Api;


/**
 * API Controller class
 *
 */
abstract class ApiController
{
    protected $ci;
    protected $logger;
    
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
    const API_ERROR_ERROR_RUNNING_COLLATEX = 1016;
    
    const API_ERROR_NOT_AUTHORIZED  = 1100;
    
    const API_ERROR_DB_UPDATE_ERROR = 1200;
            
    
    
    //Constructor
    public function __construct( $ci)
    {
       $this->ci = $ci;
       $this->db = $ci->db;
       $this->logger = $ci->logger->withName('API-transitional');
    }
}
