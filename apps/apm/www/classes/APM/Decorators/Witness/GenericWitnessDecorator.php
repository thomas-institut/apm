<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

namespace APM\Decorators\Witness;


use APM\Core\Token\Token;
use APM\Core\Witness\Witness;
use APM\Core\Witness\WitnessDecorator;

class GenericWitnessDecorator implements WitnessDecorator
{

    /**
     * @inheritDoc
     */
    public function getDecoratedTokens(Witness $w): array
    {
        $decoratedTokens = [];
        foreach($w->getTokens() as $index => $token) {
            /** @var Token $token */
            $decoratedTokens[] = [
                'class' => 'generic',
                'type' => $token->getType(),
                'text' => $token->getText(),
                'norm' => $token->getNormalization(),
                'tokenIndex' => $index
            ];
        }

        return $decoratedTokens;
    }
}