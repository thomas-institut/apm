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

namespace APM\Core\Collation;

/**
 * Decorator for collation tables interface
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
interface CollationTableDecorator {

    /**
     * Takes a CollationTable object and returns a decorated version of the table in the form of an array
     * with the following structure:
     *    $decoratedTable = [
     *        'siglum1' => [ decoratedToken1, decoratedToken2, .... ],
     *        'siglum2' => [ decoratedToken1, decoratedToken2, .... ],
     *         ...
     *    ]
     *
     * Each decoratedToken element is itself an associative array with information fields particular
     * to each implementation of the decorator. For example, a simple decorator can just take the
     * text and line numbers and, for each token, generate a array like so:
     *
     *       [ 'text' => 'the text , 'line' => lineNumber]
     *
     * Another decorator might process more token info and provide decorated tokens with complete information about
     * how they should be displayed on a website, for example:
     *   ['text'=> 'the text', 'cssClass' => 'someClass, 'popoverHtml' => ....]
     *
     * @param CollationTable $c
     * @return array
     */
    public function decorate(CollationTable $c) : array;
}
