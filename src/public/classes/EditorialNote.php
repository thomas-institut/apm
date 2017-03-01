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

/**
 * Description of editorialnote
 * 
 * EditorialNote: 
 *      type:  offline | inline 
 *      target: offline note mark or inline node id
 *      text: markup 
 *      author: Person = SQL people.id with 'annotator' in the person's role.
 *      creationTime : DateTime
 *      language:  ar | he | la | de | en | fr
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

namespace AverroesProject;

class EditorialNote {
    
    /**
     *
     * @var int
     */
    public $id;
    
    /**
     *
     * @var int
     */
    public $type;
    
    const INVALID = 0;
    const OFFLINE = 1;
    const INLINE = 2;
    
    
    /**
     *
     * @var int
     */
    public $target;
    /**
     *
     * @var int
     */
    public $authorId;
    
    /**
     *
     * @var string
     */
    public $text;
    
    /**
     *
     * @var string(datetime)
     */
    public $time;
    
    /**
     *
     * @var string
     */
    public $lang;
    
    
    /**
     * Normalizes a string according to rules for textual items:
     *   - trims all whitespace at the beginning and end of the string
     *   - converts all whitespace inside the string to a single space
     * 
     * @param string $str
     */
    private function normalizeString(string $str){
        return preg_replace('/\s+/', ' ', trim($str));
    }
    
    public function setText(string $text) 
    {
        $this->text = $this->normalizeString($text);
    }
}
