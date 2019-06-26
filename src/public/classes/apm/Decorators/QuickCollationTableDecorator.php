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

namespace APM\Decorators;

use APM\Core\Collation\CollationTableDecorator;
use APM\Core\Collation\CollationTable;

/**
 * A CollationTableDecorator for displaying quick collations in the APM
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class QuickCollationTableDecorator implements CollationTableDecorator {
    
    const CLASS_EMPTYTOKEN = 'tokennotpresent';
    const CLASS_NORMALTOKEN = 'normalToken';
    
    const TEXT_EMPTYTOKEN = '&mdash;';
    
    public function decorate(CollationTable $c): array {
        $sigla = $c->getSigla();
        $decoratedCollationTable = [];
        
        // 1. Put tokens in with basic classes
        foreach($sigla as $siglum) {
            $decoratedCollationTable[$siglum] = [];
            $tokenRefs = $c->getReferencesForRow($siglum);
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
                $decoratedToken['lineNumber'] = $token->getLineNumber();
                $decoratedToken['empty'] = false;
                $decoratedToken['witnessTokenIndex'] = $tokenRef;
                $decoratedCollationTable[$siglum][] = $decoratedToken;
            }
        }
        
        // 2. Put line breaks
        $bd = new \APM\Core\Algorithm\BoundaryDetector();
        $isEmptyFunc = function ($t) { return $t['empty'];};
        $getLineNumberFunc = function($t) { return $t['lineNumber']; };
        
        foreach($decoratedCollationTable as $siglum => &$decoratedTokens)  {
            $lineBreakIndexes = $bd->findBoundaries($decoratedTokens, $getLineNumberFunc, $isEmptyFunc);
            foreach($lineBreakIndexes as $lbIndex) {
                if ($decoratedTokens[$lbIndex]['empty'] === false) {
                    $decoratedTokens[$lbIndex]['lineBreak'] = true;
                }
            }
        }
        
        
        return $decoratedCollationTable;

    }

}
