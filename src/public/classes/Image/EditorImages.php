<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject\Image;

/**
 * Description of EditorImages
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class EditorImages {
    const FONT_AWESOME_PATH = './fonts/fontawesome-webfont.ttf';
    const FONT_ARIAL_PATH = './fonts/arialbd.ttf';
    const FONT_MONO = './fonts/cour.ttf';
    //const FONT_MONO = './fonts/LiberationMono-Regular.ttf';
    
    public static function markIcon($size) {
        $height = $size;
        $width = $size*1.2;
        $im = imagecreatetruecolor($width, $height);
        $background = imagecolorallocate($im, 255, 255, 255);
        imagecolortransparent($im, $background);
        $textcolor = imagecolorallocate($im, 255, 0, 0);
        $textsize = $size*0.8;
        $text = "\u{f0e5}";
        $fontpath = self::FONT_AWESOME_PATH;
        $bbox = imagettfbbox($textsize, 0, $fontpath, $text);
        //$bboxStr = print_r($bbox, true);
        $textWidth = $bbox[2]-$bbox[0];
        $textHeight = $bbox[5]-$bbox[3];
        $x = ($width / 2) - ($textWidth/2) - $bbox[0];
        $y = ($height / 2) - ($textHeight/ 2) - $bbox[1];
        imagefilledrectangle($im, 0, 0, $width-1, $height-1, $background);
        imagettftext($im, $textsize, 0, $x, $y, $textcolor, $fontpath, $text);
        ob_start();
        imagepng($im);
        $image_data = ob_get_contents();
        ob_end_clean();
        //return $bboxStr;
        return $image_data;
    }
    
    public static function noWordBreakIcon($size) {
        $height = $size;
        $width = $size*0.8;
        $im = imagecreatetruecolor($width, $height);
        $background = imagecolorallocate($im, 255, 255, 255);
        imagecolortransparent($im, $background);
        $textcolor = imagecolorallocate($im, 200, 200, 200);
        $textsize = $size*0.8;
        $text = "‒";
        $fontpath = self::FONT_ARIAL_PATH;
        $bbox = imagettfbbox($textsize, 0, $fontpath, $text);
        $textWidth = $bbox[2]-$bbox[0];
        $textHeight = $bbox[5]-$bbox[3];
        $x = ($width / 2) - ($textWidth/2) - $bbox[0];
        $y = ($height / 2) - ($textHeight/ 2) - $bbox[1];
        imagefilledrectangle($im, 0, 0, $width-1, $height-1, $background);
        imagettftext($im, $textsize, 0, $x, $y, $textcolor, $fontpath, $text);
        ob_start();
        imagepng($im);
        $image_data = ob_get_contents();
        ob_end_clean();
        return $image_data;
    }
    
    public static function illegibleIcon($size, $length) {
        $textsize = $size*0.8;
        $text = str_repeat("\u{f070}", $length);
        $fontpath = self::FONT_AWESOME_PATH;
        $bbox = imagettfbbox($textsize, 0, $fontpath, $text);
        $textWidth = $bbox[2]-$bbox[0];
        $textHeight = $bbox[5]-$bbox[3];
        
        $height = $size;
        $width = $textWidth + 2;
        $im = imagecreatetruecolor($width, $height);
        $background = imagecolorallocate($im, 230, 230, 230);
        imagecolortransparent($im, $background);
        $textcolor = imagecolorallocate($im, 0, 10, 200);
        $x = ($width / 2) - ($textWidth/2) - $bbox[0];
        $y = ($height / 2) - ($textHeight/ 2) - $bbox[1];
        imagefilledrectangle($im, 0, 0, $width-1, $height-1, $background);
        imagettftext($im, $textsize, 0, $x, $y, $textcolor, $fontpath, $text);
        ob_start();
        imagepng($im);
        $image_data = ob_get_contents();
        ob_end_clean();
        //return $bboxStr;
        return $image_data;
    }
    
    
    public static function ChunkMarkIcon($size, $dareId, $chunkNumber, $type, $dir) {
        $textsize = $size*0.7;
        $typeLabel = 'Start';
        if ($type === 'end') {
            $typeLabel = 'End';
        }
        $text = "$typeLabel $dareId-$chunkNumber";
       

        $fontpath = self::FONT_MONO;
        $bbox = imagettfbbox($textsize, 0, $fontpath, $text);
        $textWidth = $bbox[2]-$bbox[0];
        $textHeight = $bbox[5]-$bbox[3];
        
        $height = $size+5;
        $width = $textWidth + 5;
        $im = imagecreatetruecolor($width, $height);
        $background = imagecolorallocate($im, 229, 238, 252);
        //imagecolortransparent($im, $background);
        $textcolor = imagecolorallocate($im, 50, 50, 50);
        $x = ($width / 2) - ($textWidth/2) - $bbox[0];
        $y = ($height / 2) - ($textHeight/ 2) - $bbox[1];
        imagefilledrectangle($im, 0, 0, $width-1, $height-1, $background);
        imagettftext($im, $textsize, 0, $x, $y, $textcolor, $fontpath, $text);
        ob_start();
        imagepng($im);
        $image_data = ob_get_contents();
        ob_end_clean();
        //return $bboxStr;
        return $image_data;
    }
    
    public static function LineGapImage($size, $count) {
        $textsize = $size*0.7;
        $text = "[ $count line(s) not transcribed ]";


        $fontpath = self::FONT_MONO;
        $bbox = imagettfbbox($textsize, 0, $fontpath, $text);
        $textWidth = $bbox[2]-$bbox[0];
        $textHeight = $bbox[5]-$bbox[3];
        
        $height = $size+40;
        $width = $textWidth + 5;
        $im = imagecreatetruecolor($width, $height);
        $background = imagecolorallocate($im, 244, 245, 247);
        //imagecolortransparent($im, $background);
        $textcolor = imagecolorallocate($im, 50, 50, 50);
        $x = ($width / 2) - ($textWidth/2) - $bbox[0];
        $y = ($height / 2) - ($textHeight/ 2) - $bbox[1];
        imagefilledrectangle($im, 0, 0, $width-1, $height-1, $background);
        imagettftext($im, $textsize, 0, $x, $y, $textcolor, $fontpath, $text);
        ob_start();
        imagepng($im);
        $image_data = ob_get_contents();
        ob_end_clean();
        //return $bboxStr;
        return $image_data;
    }
    
}
