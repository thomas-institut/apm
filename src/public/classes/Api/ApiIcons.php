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

namespace AverroesProject\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

/**
 * API Controller class
 *
 */
class ApiIcons extends ApiController
{
   
 
    public function generateMarkIcon(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        
        $imageData = \AverroesProject\Image\EditorImages::markIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
     public function generateNoWordBreakIcon(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        
        $imageData = \AverroesProject\Image\EditorImages::noWordBreakIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateIllegibleIcon(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        $length = $request->getAttribute('length');
        
        $imageData = \AverroesProject\Image\EditorImages::illegibleIcon($size, $length);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
        //return $response;
    }
    
    public function generateChunkMarkIcon(Request $request, 
            Response $response, $next)
    {
        $dareId = $request->getAttribute('dareid');
        $chunkNumber = $request->getAttribute('chunkno');
        $type = $request->getAttribute('type');
        $size = $request->getAttribute('size');
        $segment = $request->getAttribute('segment');
        $dir = $request->getAttribute('dir');
        
        $imageData = \AverroesProject\Image\EditorImages::ChunkMarkIcon($size, $dareId, $chunkNumber, $segment, $type, $dir);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateLineGapImage(Request $request, 
            Response $response, $next)
    {
        $count = $request->getAttribute('count');
        $size = $request->getAttribute('size');
        
        $imageData = \AverroesProject\Image\EditorImages::LineGapImage($size, $count);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateCharacterGapImage(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        $length = $request->getAttribute('length');
        
        $imageData = \AverroesProject\Image\EditorImages::CharacterGapImage($size, $length);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateParagraphMarkIcon(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        
        $imageData = \AverroesProject\Image\EditorImages::paragraphMarkIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
 
}
