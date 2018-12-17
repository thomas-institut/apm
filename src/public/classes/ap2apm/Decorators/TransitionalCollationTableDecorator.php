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

namespace AverroesProjectToApm\Decorators;

use APM\Core\Collation\CollationTableDecorator;
use APM\Core\Collation\CollationTable;

/**
 * Description of QuickCollationTableDecorator
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class TransitionalCollationTableDecorator implements CollationTableDecorator {
    
    const CLASS_EMPTYTOKEN = 'tokennotpresent';
    const CLASS_NORMALTOKEN = 'normalToken';
    
    const TEXT_EMPTYTOKEN = '&mdash;';
    
    public function decorate(CollationTable $c): array {
        $sigla = $c->getSigla();
        $decoratedCollationTable = [];
        
        // 1. Put tokens in with basic classes
        foreach($sigla as $siglum) {
            $decoratedCollationTable[$siglum] = [];
            $tokenRefs = $c->getWitnessCollationRawTokens($siglum);
            $witnessTokens = $c->getWitnessTokens($siglum);
            foreach($tokenRefs as $tokenRef) {
                $decoratedToken = [];
                if ($tokenRef === CollationTable::TOKENREF_NULL) {
                    $decoratedToken['text'] = self::TEXT_EMPTYTOKEN;
                    $decoratedToken['classes'] = [self::CLASS_EMPTYTOKEN];
                    $decoratedToken['empty'] = true;
                    $decoratedCollationTable[$siglum][] = $decoratedToken;
                    continue;
                }
                $token = $witnessTokens[$tokenRef];
                $decoratedToken['text'] = $token->getText();
                $decoratedToken['classes'] = [self::CLASS_NORMALTOKEN];
                //$decoratedToken['lineNumber'] = $token->getLineNumber();
                $decoratedToken['empty'] = false;
                $decoratedToken['witnessTokenIndex'] = $tokenRef;
                $decoratedCollationTable[$siglum][] = $decoratedToken;
            }
        }
        
        // 2. Put line breaks
//        $bd = new \APM\Core\Algorithm\BoundaryDetector();
//        $isEmptyFunc = function ($t) { return $t['empty'];};
//        $getLineNumberFunc = function($t) { return $t['lineNumber']; };
//        
//        foreach($decoratedCollationTable as $siglum => &$decoratedTokens)  {
//            $lineBreakIndexes = $bd->findBoundaries($decoratedTokens, $getLineNumberFunc, $isEmptyFunc);
//            foreach($lineBreakIndexes as $lbIndex) {
//                if ($decoratedTokens[$lbIndex]['empty'] === false) {
//                    $decoratedTokens[$lbIndex]['lineBreak'] = true;
//                }
//            }
//        }
        
        
        return $decoratedCollationTable;

    }

}
