<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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

namespace APM\Decorators;

use APM\Core\Collation\CollationTableDecorator;
use APM\Core\Collation\Collation;

/**
 * Description of QuickCollationTableDecorator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class QuickCollationTableDecorator implements CollationTableDecorator {
    
    const CLASS_EMPTYTOKEN = 'tokennotpresent';
    const CLASS_NORMALTOKEN = 'normalToken';
    
    const TEXT_EMPTYTOKEN = '&mdash;';
    
    public function decorate(Collation $c): array {
        $collationTable = $c->getCollationTable();
        
        $decoratedCollationTable = [];
        
        // 1. Put tokens in with basic classes
        foreach($collationTable as $siglum => $tokens) {
            $decoratedCollationTable[$siglum] = [];
            foreach($tokens as $token) {
                $decoratedToken = [];
                if ($token->isEmpty()) {
                    $decoratedToken['text'] = self::TEXT_EMPTYTOKEN;
                    $decoratedToken['class'] = self::CLASS_EMPTYTOKEN;
                    $decoratedCollationTable[$siglum][] = $decoratedToken;
                    continue;
                }
                $decoratedToken['text'] = $token->getText();
                $decoratedToken['class'] = self::CLASS_NORMALTOKEN;
                $decoratedToken['lineNumber'] = $token->getLineNumber();
                $decoratedCollationTable[$siglum][] = $decoratedToken;
            }
        }
        
//        // 2. Put line breaks
//        foreach($collationTable as $siglum => $tokens) {
//            foreach($tokens as $index => $token) {
//                $decoratedCollationTable[$siglum][]
//            }
//        }
        return $decoratedCollationTable;
    }

}
