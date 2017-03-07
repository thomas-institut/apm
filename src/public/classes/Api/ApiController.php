<?php
/*
 * Copyright (C) 2016 Universität zu Köln
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

namespace AverroesProject\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

/**
 * API Controller class
 *
 */
class ApiController
{
    protected $ci;
   //Constructor
   public function __construct( $ci) {
       $this->ci = $ci;
       $this->db = $ci->db;
   }
   
   public function getElementsByDocPageCol(Request $request, Response $response, $next){
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        $columnNumber = $request->getAttribute('column');

        // Get the elements
        $elements = $this->db->getColumnElements($docId, $pageNumber, $columnNumber);
        if ($elements === NULL){
            $elements = [];
        }
        // Get the editorial notes
        $ednotes = $this->db->getEditorialNotesByDocPageCol($docId, $pageNumber, $columnNumber);

        if ($ednotes === NULL){
            $ednotes = [];
        }

        // Get the information about every person in the elements and editorial notes
        $people = [];
        foreach($elements as $e){
            if (!isset($people[$e->editorId])){
                $people[$e->editorId] = $this->ci->um->getUserInfoByUserId($e->editorId);
            }
        }
        foreach($ednotes as $e){
            if (!isset($people[$e->authorId])){
                $people[$e->authorId] = $this->ci->um->getUserInfoByUserId($e->authorId);
            }
        }

        return $response->withJson(['elements' => $elements, 
            'ednotes' => $ednotes, 
            'people' => $people, 
            'info' => ['col' => (int) $columnNumber]]);
   }
   
   public function getNumColumns(Request $request, Response $response, $next){
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        
        $numColumns = $this->db->getNumColumns($docId, $pageNumber);
        
        return $response->withJson($numColumns);
   }
   
   public function updateUserProfile(Request $request, Response $response, $next){
       $profileUser = $request->getAttribute('userId');
       
       return $response->withStatus(200);
       
   }
}
