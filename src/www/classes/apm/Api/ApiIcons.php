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

use AverroesProject\Image\EditorImages;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;


/**
 * Class ApiIcons
 *
 * @package APM\Api
 */
class ApiIcons extends ApiController
{

    public function generateMarkIcon(Request $request, Response $response)
    {
        $size = $request->getAttribute('size');
        
        $imageData = EditorImages::markIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
     public function generateNoWordBreakIcon(Request $request, Response $response)
    {
        $size = $request->getAttribute('size');
        
        $imageData = EditorImages::noWordBreakIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateIllegibleIcon(Request $request, Response $response)
    {
        $size = $request->getAttribute('size');
        $length = $request->getAttribute('length');
        
        $imageData = EditorImages::illegibleIcon($size, $length);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
        //return $response;
    }
    
    public function generateChunkMarkIcon(Request $request, Response $response)
    {
        $dareId = $request->getAttribute('dareid');
        $chunkNumber = $request->getAttribute('chunkno');
        $type = $request->getAttribute('type');
        $size = $request->getAttribute('size');
        $segment = $request->getAttribute('segment');
        $dir = $request->getAttribute('dir');
        $localWitnessId =$request->getAttribute('lwid');
        
        $imageData = EditorImages::ChunkMarkIcon($size, $dareId, $chunkNumber, $segment, $type, $dir, $localWitnessId);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }

    public function generateChapterMarkIcon(Request $request, Response $response)
    {
        $work = $request->getAttribute('work');
        $level = intval($request->getAttribute('level'));
        $chapterNumber = intval($request->getAttribute('number'));
        $type = $request->getAttribute('type');
        $dir = $request->getAttribute('dir');
        $size = $request->getAttribute('size');

        $imageData = EditorImages::ChapterMarkIcon($size, $work, $level, $chapterNumber, $type, $dir);

        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateLineGapImage(Request $request, Response $response)
    {
        $count = $request->getAttribute('count');
        $size = $request->getAttribute('size');
        
        $imageData = EditorImages::LineGapImage($size, $count);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateCharacterGapImage(Request $request,  Response $response)
    {
        $size = $request->getAttribute('size');
        $length = $request->getAttribute('length');
        
        $imageData = EditorImages::CharacterGapImage($size, $length);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateParagraphMarkIcon(Request $request, Response $response)
    {
        $size = $request->getAttribute('size');
        
        $imageData = EditorImages::paragraphMarkIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
 
}
